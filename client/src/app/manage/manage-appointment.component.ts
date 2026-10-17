import { Component, computed, inject, Input, OnDestroy, OnInit, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AppointmentService } from '../booking/appointment.service';
import { GuestBookingsService } from '../shared/services/guest-bookings.service';
import { SharedService } from '../shared/services/shared.service';
import { ManagedAppointment } from '../shared/interfaces/appointment.interface';
import { ReviewFormComponent } from '../reviews/review-form.component';
import { StaffAvatarComponent } from '../shared/services/staff-avatar.component';
import { StarRatingComponent } from '../shared/services/star-rating.component';
import { formatDuration, fromDateKey } from '../shared/services/time.utils';
import { alerts } from '../shared/services/alerts';

/** Ver, cancelar o valorar una cita con su enlace secreto (sin necesidad de cuenta). */
@Component({
  selector: 'app-manage-appointment',
  standalone: true,
  imports: [CurrencyPipe, DatePipe, RouterLink, ReviewFormComponent, StaffAvatarComponent, StarRatingComponent],
  templateUrl: './manage-appointment.component.html',
})
export default class ManageAppointmentComponent implements OnInit, OnDestroy {
  private api = inject(AppointmentService);
  private guestBookings = inject(GuestBookingsService);
  readonly store = inject(SharedService);

  @Input() token = '';
  /** `?pago=ok|cancelado` al volver de Stripe. */
  @Input() pago = '';

  readonly appointment = signal<ManagedAppointment | null>(null);
  readonly state = signal<'loading' | 'ready' | 'notfound' | 'cancelled' | 'error'>('loading');
  readonly cancelling = signal(false);
  readonly reviewOpen = signal(false);
  readonly formatDuration = formatDuration;
  private pollTimer: ReturnType<typeof setTimeout> | null = null;
  private polls = 0;

  readonly date = computed(() => (this.appointment() ? fromDateKey(this.appointment()!.date) : null));

  readonly calendarLink = computed(() => {
    const a = this.appointment();
    if (!a) return '';
    const stamp = (time: string) => `${a.date.replace(/-/g, '')}T${time.replace(':', '')}00`;
    const info = this.store.businessInfo();
    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: `${a.service.title}${info.name ? ' · ' + info.name : ''}`,
      dates: `${stamp(a.startTime)}/${stamp(a.endTime)}`,
      location: info.address ?? '',
    });
    return `https://calendar.google.com/calendar/render?${params}`;
  });

  async ngOnInit() {
    this.store.loadBusinessInfo().catch(() => undefined);
    if (this.pago === 'cancelado') alerts.info('Pago cancelado', 'Tu reserva no se ha completado.');
    await this.load();
  }

  ngOnDestroy() {
    if (this.pollTimer) clearTimeout(this.pollTimer);
  }

  async load() {
    try {
      const appointment = await firstValueFrom(this.api.getManaged(this.token));
      this.appointment.set(appointment);
      this.state.set('ready');
      this.guestBookings.add(this.token);

      // Al volver del pago, el webhook puede tardar unos segundos: reintentamos.
      if (appointment.status === 'pending_payment' && this.pago === 'ok' && this.polls < 10) {
        this.polls++;
        this.pollTimer = setTimeout(() => this.load(), 2000);
      } else if (appointment.status === 'confirmed' && this.pago === 'ok' && this.polls) {
        alerts.success('¡Pago recibido! Tu cita está confirmada.');
      }
    } catch (error) {
      if (error instanceof HttpErrorResponse && error.status === 404) {
        this.guestBookings.remove(this.token);
        this.state.set('notfound');
      } else {
        this.state.set('error');
      }
    }
  }

  async cancel() {
    const a = this.appointment();
    if (!a) return;
    const confirmed = await alerts.confirm({
      title: '¿Cancelar esta cita?',
      text: `${a.service.title} · ${a.date.split('-').reverse().join('/')} a las ${a.startTime}`,
      confirmText: 'Sí, cancelar',
      cancelText: 'Mantener',
      danger: true,
    });
    if (!confirmed) return;

    this.cancelling.set(true);
    try {
      await firstValueFrom(this.api.cancelManaged(this.token));
      this.guestBookings.remove(this.token);
      this.state.set('cancelled');
      alerts.success('Cita cancelada');
    } catch (error) {
      alerts.error(error, 'No se ha podido cancelar la cita');
    } finally {
      this.cancelling.set(false);
    }
  }

  onReviewed(rating: number) {
    const a = this.appointment();
    if (a) this.appointment.set({ ...a, canReview: false, review: { id: 'new', rating } });
  }
}
