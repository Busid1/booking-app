import { Component, computed, EventEmitter, inject, Input, OnChanges, Output, signal, SimpleChanges, ViewChild } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { DatePickerComponent } from './datePicker/datePicker.component';
import { AppointmentService } from './appointment.service';
import { ModalComponent } from '../shared/services/modal.component';
import { SharedService } from '../shared/services/shared.service';
import { GuestBookingsService } from '../shared/services/guest-bookings.service';
import { TurnstileComponent } from '../shared/services/turnstile.component';
import { StaffAvatarComponent } from '../shared/services/staff-avatar.component';
import { StarRatingComponent } from '../shared/services/star-rating.component';
import { AuthService } from '../auth/auth.service';
import { ServiceInterface } from '../shared/interfaces/service.interface';
import { StaffInterface } from '../shared/interfaces/staff.interface';
import { BusinessHoursInterface } from '../shared/interfaces/business-hours.interface';
import { addDays, addMinutes, formatDuration, fromDateKey, mondayBasedDay, toDateKey } from '../shared/services/time.utils';
import { alerts, getErrorMessage } from '../shared/services/alerts';
import { PwaCardComponent } from '../shared/services/pwa-card.component';

type Step = 'staff' | 'datetime' | 'details' | 'done';

const CONTACT_KEY = 'bookly.guestContact';

interface GuestContact {
  name: string;
  email: string;
  phone: string;
}

/**
 * Asistente de reserva: profesional → día y hora → datos y confirmación → hecho.
 * Funciona con o sin cuenta; si el servicio tiene señal, redirige al pago de Stripe.
 */
@Component({
  selector: 'app-booking',
  templateUrl: './booking.component.html',
  standalone: true,
  imports: [
    DatePickerComponent, ModalComponent, CurrencyPipe, DatePipe, RouterLink, FormsModule,
    TurnstileComponent, StaffAvatarComponent, StarRatingComponent, PwaCardComponent,
  ],
})
export class BookingComponent implements OnChanges {
  private appointmentService = inject(AppointmentService);
  private guestBookings = inject(GuestBookingsService);
  private router = inject(Router);
  readonly store = inject(SharedService);
  readonly auth = inject(AuthService);

  @Input() open = false;
  @Input() service: ServiceInterface | null = null;
  /** Profesional preseleccionado (p. ej. desde /reservar/:slug). */
  @Input() preselectedStaffId: string | null = null;
  @Output() closed = new EventEmitter<void>();

  @ViewChild(TurnstileComponent) turnstile?: TurnstileComponent;

  readonly step = signal<Step>('datetime');
  /** null = negocio sin profesionales; 'any' = cualquiera; o el id del profesional. */
  readonly staffChoice = signal<string | null>(null);
  readonly selectedDate = signal<string | null>(null);
  readonly selectedTime = signal<string | null>(null);
  readonly slots = signal<string[]>([]);
  readonly isLoadingSlots = signal(false);
  readonly isSubmitting = signal(false);
  readonly isPreparing = signal(false);
  readonly turnstileToken = signal<string | null>(null);
  readonly bookedToken = signal<string | null>(null);
  readonly bookedStaffName = signal<string | null>(null);
  readonly formatDuration = formatDuration;

  guest: GuestContact = { name: '', email: '', phone: '' };
  rememberMe = true;

  private requestId = 0;
  private resetId = 0;

  readonly eligibleStaff = computed<StaffInterface[]>(() =>
    this.service?.id ? this.store.staffForService(this.service.id) : [],
  );

  readonly selectedStaff = computed<StaffInterface | null>(() =>
    this.eligibleStaff().find(s => s.id === this.staffChoice()) ?? null,
  );

  readonly hasStaffStep = computed(() => this.eligibleStaff().length > 1);

  readonly needsDeposit = computed(() =>
    !!this.store.config()?.payments && !!this.service?.deposit && this.service.deposit > 0 && !this.auth.isAdmin(),
  );

  readonly cancellationHours = computed(() => this.store.businessInfo().cancellationHours ?? 0);

  /** Horario a mostrar en el selector de días según el profesional elegido. */
  readonly schedule = computed<BusinessHoursInterface[]>(() => {
    const choice = this.staffChoice();
    if (choice === null) return this.store.weekSchedule();
    const staff = choice === 'any' ? this.eligibleStaff() : this.eligibleStaff().filter(s => s.id === choice);
    return Array.from({ length: 7 }, (_, day) => {
      const open = staff.some(s => !s.schedule[day]?.isClosed);
      return { dayOfWeek: day, isClosed: !open, timeBlocks: open ? [{ openTime: '00:00', closeTime: '23:59' }] : [] };
    });
  });

  get endTime(): string {
    return this.selectedTime() && this.service ? addMinutes(this.selectedTime()!, this.service.duration) : '';
  }

  ngOnChanges(changes: SimpleChanges) {
    if ((changes['open'] || changes['service']) && this.open && this.service) {
      this.reset();
    }
  }

  private loadGuestContact() {
    try {
      const saved = JSON.parse(localStorage.getItem(CONTACT_KEY) ?? 'null');
      if (saved && typeof saved === 'object') this.guest = { name: saved.name ?? '', email: saved.email ?? '', phone: saved.phone ?? '' };
    } catch {
      /* sin datos guardados */
    }
  }

  private saveGuestContact() {
    try {
      if (this.rememberMe) localStorage.setItem(CONTACT_KEY, JSON.stringify(this.guest));
      else localStorage.removeItem(CONTACT_KEY);
    } catch {
      /* almacenamiento no disponible */
    }
  }

  private async reset() {
    const resetId = ++this.resetId;
    this.step.set('datetime');
    this.selectedTime.set(null);
    this.selectedDate.set(null);
    this.slots.set([]);
    this.turnstileToken.set(null);
    this.bookedToken.set(null);
    this.loadGuestContact();
    this.isPreparing.set(true);

    try {
      await Promise.all([
        this.store.hoursLoaded() ? null : this.store.loadAllBusinessHours(),
        this.store.staffLoaded() ? null : this.store.loadStaff(),
        this.store.infoLoaded() ? null : this.store.loadBusinessInfo(),
        this.store.loadConfig(),
      ]);
    } catch (error) {
      alerts.error(error, 'No se ha podido preparar la reserva');
      return;
    } finally {
      this.isPreparing.set(false);
    }
    if (resetId !== this.resetId) return;

    const eligible = this.eligibleStaff();
    if (!eligible.length) {
      this.staffChoice.set(null);
    } else if (this.preselectedStaffId && eligible.some(s => s.id === this.preselectedStaffId)) {
      this.staffChoice.set(this.preselectedStaffId);
    } else if (eligible.length === 1) {
      this.staffChoice.set(eligible[0].id);
    } else {
      this.staffChoice.set('any');
      this.step.set('staff');
      return;
    }
    await this.selectFirstAvailableDate(resetId);
  }

  chooseStaff(choice: string) {
    this.staffChoice.set(choice);
    this.selectedDate.set(null);
    this.selectedTime.set(null);
    this.step.set('datetime');
    this.selectFirstAvailableDate(++this.resetId);
  }

  /** Busca el primer día (en las próximas 2 semanas) con huecos libres y lo preselecciona. */
  private async selectFirstAvailableDate(resetId: number) {
    const schedule = this.schedule();
    for (let i = 0; i < 14; i++) {
      const date = addDays(new Date(), i);
      if (schedule[mondayBasedDay(date)].isClosed) continue;
      await this.onDateSelected(toDateKey(date));
      if (this.slots().length || !this.open || resetId !== this.resetId) return;
    }
  }

  selectedDateObj(): Date | null {
    return this.selectedDate() ? fromDateKey(this.selectedDate()!) : null;
  }

  /** Selección manual: cancela la preselección automática en curso. */
  onUserDateSelected(date: string) {
    this.resetId++;
    this.onDateSelected(date);
  }

  private async onDateSelected(date: string) {
    if (!this.service?.id) return;
    const id = ++this.requestId;
    this.selectedDate.set(date);
    this.selectedTime.set(null);
    this.isLoadingSlots.set(true);

    try {
      const { slots } = await firstValueFrom(this.appointmentService.getSlots(date, this.service.id, this.staffChoice()));
      if (id !== this.requestId) return; // respuesta obsoleta
      this.slots.set(slots);
    } catch (error) {
      if (id === this.requestId) {
        this.slots.set([]);
        alerts.error(error, 'No se ha podido consultar la disponibilidad');
      }
    } finally {
      if (id === this.requestId) this.isLoadingSlots.set(false);
    }
  }

  onHourSelected(hour: string) {
    this.resetId++;
    this.selectedTime.set(hour);
  }

  goToDetails() {
    if (this.selectedDate() && this.selectedTime()) this.step.set('details');
  }

  back() {
    if (this.step() === 'details') this.step.set('datetime');
    else if (this.step() === 'datetime' && this.hasStaffStep() && !this.preselectedStaffId) this.step.set('staff');
  }

  get guestValid(): boolean {
    const emailOk = !this.guest.email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.guest.email.trim());
    const phoneOk = !this.guest.phone || /^\+?[0-9\s().-]{6,20}$/.test(this.guest.phone.trim());
    return !!this.guest.name.trim() && (!!this.guest.email.trim() || !!this.guest.phone.trim()) && emailOk && phoneOk;
  }

  get canSubmit(): boolean {
    if (this.isSubmitting()) return false;
    if (this.auth.isLoggedIn()) return true;
    const needsCaptcha = !!this.store.config()?.turnstileSiteKey;
    return this.guestValid && (!needsCaptcha || !!this.turnstileToken());
  }

  goLogin() {
    this.close();
    this.router.navigate(['/auth/login'], { queryParams: { returnUrl: `/servicios?reservar=${this.service?.id}` } });
  }

  async confirm() {
    if (!this.service?.id || !this.selectedDate() || !this.selectedTime() || !this.canSubmit) return;
    this.isSubmitting.set(true);
    const isGuest = !this.auth.isLoggedIn();

    try {
      const result = await firstValueFrom(this.appointmentService.createAppointment({
        date: this.selectedDate()!,
        startTime: this.selectedTime()!,
        endTime: this.endTime,
        serviceId: this.service.id,
        staffId: this.staffChoice(),
        ...(isGuest
          ? {
              clientName: this.guest.name.trim(),
              clientEmail: this.guest.email.trim() || null,
              clientPhone: this.guest.phone.trim() || null,
              turnstileToken: this.turnstileToken(),
            }
          : {}),
      }));

      if (isGuest) {
        this.saveGuestContact();
        this.guestBookings.add(result.manageToken);
      }
      this.bookedToken.set(result.manageToken ?? null);

      if (result.checkoutUrl) {
        alerts.info('Te llevamos al pago de la señal…');
        window.location.href = result.checkoutUrl;
        return;
      }

      const staffName = this.store.staff().find(s => s.id === result.staffId)?.name ?? null;
      this.bookedStaffName.set(staffName);
      this.step.set('done');
      if (!isGuest) this.store.loadAllUserAppointments().catch(() => undefined);
    } catch (error) {
      this.turnstile?.reset();
      if (error instanceof HttpErrorResponse && error.status === 409) {
        // El hueco ya no está disponible: refrescamos la disponibilidad.
        alerts.warning('Ese hueco ya no está disponible', getErrorMessage(error));
        this.step.set('datetime');
        await this.onDateSelected(this.selectedDate()!);
      } else {
        alerts.error(error, 'No se ha podido reservar la cita');
      }
    } finally {
      this.isSubmitting.set(false);
    }
  }

  close() {
    this.requestId++;
    this.resetId++;
    this.closed.emit();
  }
}
