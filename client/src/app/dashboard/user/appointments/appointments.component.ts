import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { SharedService } from '../../../shared/services/shared.service';
import { GuestBookingsService } from '../../../shared/services/guest-bookings.service';
import { AppointmentService } from '../../../booking/appointment.service';
import { AuthService } from '../../../auth/auth.service';
import { ReviewFormComponent } from '../../../reviews/review-form.component';
import { StaffAvatarComponent } from '../../../shared/services/staff-avatar.component';
import { StarRatingComponent } from '../../../shared/services/star-rating.component';
import { ManagedAppointment } from '../../../shared/interfaces/appointment.interface';
import { fromDateKey, isPast, todayKey, toMinutes, nowTime } from '../../../shared/services/time.utils';
import { alerts } from '../../../shared/services/alerts';
import { PwaCardComponent } from '../../../shared/services/pwa-card.component';

type Tab = 'upcoming' | 'past';

/** Cita normalizada (de la cuenta o reservada como invitado en este dispositivo). */
interface MyAppointment {
  key: string;
  id?: string;
  token?: string;
  date: string;
  startTime: string;
  endTime: string;
  serviceTitle: string;
  price: number;
  staff?: { name: string; photo?: string | null; color?: string } | null;
  review?: { rating: number } | null;
  guest: boolean;
}
@Component({
  selector: 'app-appointments',
  templateUrl: './appointments.component.html',
  standalone: true,
  imports: [CurrencyPipe, DatePipe, RouterLink, ReviewFormComponent, StaffAvatarComponent, StarRatingComponent, PwaCardComponent],
})
export class AppointmentsComponent implements OnInit {
  private store = inject(SharedService);
  private guestBookings = inject(GuestBookingsService);
  private appointmentsService = inject(AppointmentService);
  readonly auth = inject(AuthService);

  readonly isLoading = signal(true);
  readonly loadError = signal(false);
  readonly tab = signal<Tab>('upcoming');
  readonly cancellingKey = signal<string | null>(null);
  readonly guestAppointments = signal<ManagedAppointment[]>([]);
  readonly reviewing = signal<MyAppointment | null>(null);
  readonly today = todayKey();

  private readonly all = computed<MyAppointment[]>(() => {
    const own: MyAppointment[] = this.auth.isLoggedIn()
      ? this.store.userAppointments().map(a => ({
          key: a.id!,
          id: a.id,
          date: a.date,
          startTime: a.startTime,
          endTime: a.endTime,
          serviceTitle: a.service?.title ?? 'Cita',
          price: a.service?.price ?? 0,
          staff: a.staff,
          review: a.review,
          guest: false,
        }))
      : [];
    const ownIds = new Set(own.map(a => a.id));
    const guest: MyAppointment[] = this.guestAppointments()
      .filter(a => !ownIds.has(a.id))
      .map(a => ({
        key: a.manageToken,
        id: a.id,
        token: a.manageToken,
        date: a.date,
        startTime: a.startTime,
        endTime: a.endTime,
        serviceTitle: a.service.title,
        price: a.service.price,
        staff: a.staff,
        review: a.review,
        guest: true,
      }));
    return [...own, ...guest].sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime));
  });

  readonly upcoming = computed(() => this.all().filter(a => !isPast(a.date, a.endTime)));
  readonly past = computed(() => this.all().filter(a => isPast(a.date, a.endTime)).reverse());
  readonly visible = computed(() => (this.tab() === 'upcoming' ? this.upcoming() : this.past()));
  readonly nextAppointment = computed(() => this.upcoming()[0] ?? null);
  readonly hasGuest = computed(() => this.all().some(a => a.guest));

  async ngOnInit() {
    this.store.loadBusinessInfo().catch(() => undefined);
    await this.load();
  }

  async load() {
    this.loadError.set(false);
    this.isLoading.set(true);
    try {
      const tokens = this.guestBookings.tokens();
      const [guest] = await Promise.all([
        tokens.length ? firstValueFrom(this.appointmentsService.getManagedBatch(tokens)) : Promise.resolve([]),
        this.auth.isLoggedIn() ? this.store.loadAllUserAppointments() : Promise.resolve(),
      ]);
      this.guestAppointments.set(guest);
      this.guestBookings.keepOnly(guest.map(a => a.manageToken));
    } catch {
      this.loadError.set(true);
    } finally {
      this.isLoading.set(false);
    }
  }

  asDate(key: string): Date {
    return fromDateKey(key);
  }

  /** Respeta la antelación mínima configurada por el negocio. */
  canCancel(a: MyAppointment): boolean {
    if (isPast(a.date, a.startTime)) return false;
    const hours = this.store.businessInfo().cancellationHours ?? 0;
    if (!hours) return true;
    const start = fromDateKey(a.date).getTime() + toMinutes(a.startTime) * 60_000;
    const now = fromDateKey(this.today).getTime() + toMinutes(nowTime()) * 60_000;
    return start - now >= hours * 3_600_000;
  }

  async cancel(a: MyAppointment) {
    const confirmed = await alerts.confirm({
      title: '¿Cancelar esta cita?',
      text: `${a.serviceTitle} · ${a.date.split('-').reverse().join('/')} a las ${a.startTime}`,
      confirmText: 'Sí, cancelar',
      cancelText: 'Mantener',
      danger: true,
    });
    if (!confirmed) return;

    this.cancellingKey.set(a.key);
    try {
      if (a.guest && a.token) {
        await firstValueFrom(this.appointmentsService.cancelManaged(a.token));
        this.guestBookings.remove(a.token);
        this.guestAppointments.update(list => list.filter(x => x.manageToken !== a.token));
      } else if (a.id) {
        await firstValueFrom(this.appointmentsService.deleteAppointment(a.id));
        this.store.userAppointments.update(list => list.filter(x => x.id !== a.id));
      }
      alerts.success('Cita cancelada');
    } catch (error) {
      alerts.error(error, 'No se ha podido cancelar la cita');
    } finally {
      this.cancellingKey.set(null);
    }
  }

  onReviewed(rating: number) {
    const a = this.reviewing();
    if (!a) return;
    if (a.guest) {
      this.guestAppointments.update(list => list.map(x => (x.manageToken === a.token ? { ...x, review: { id: 'new', rating }, canReview: false } : x)));
    } else {
      this.store.userAppointments.update(list => list.map(x => (x.id === a.id ? { ...x, review: { id: 'new', rating } } : x)));
    }
  }
}
