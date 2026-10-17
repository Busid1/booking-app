import { Component, EventEmitter, inject, Input, OnChanges, Output, signal, SimpleChanges } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { DatePickerComponent } from './datePicker/datePicker.component';
import { AppointmentService } from './appointment.service';
import { computeAvailableSlots } from './booking.utils';
import { ModalComponent } from '../shared/services/modal.component';
import { SharedService } from '../shared/services/shared.service';
import { ServiceInterface } from '../shared/interfaces/service.interface';
import { addDays, addMinutes, formatDuration, fromDateKey, mondayBasedDay, toDateKey } from '../shared/services/time.utils';
import { alerts, getErrorMessage } from '../shared/services/alerts';

type Step = 'datetime' | 'confirm' | 'done';

/** Asistente de reserva en tres pasos: día y hora → confirmación → hecho. */
@Component({
  selector: 'app-booking',
  templateUrl: './booking.component.html',
  standalone: true,
  imports: [DatePickerComponent, ModalComponent, CurrencyPipe, DatePipe, RouterLink],
})
export class BookingComponent implements OnChanges {
  private appointmentService = inject(AppointmentService);
  readonly store = inject(SharedService);

  @Input() open = false;
  @Input() service: ServiceInterface | null = null;
  @Output() closed = new EventEmitter<void>();

  readonly step = signal<Step>('datetime');
  readonly selectedDate = signal<string | null>(null);
  readonly selectedTime = signal<string | null>(null);
  readonly slots = signal<string[]>([]);
  readonly isLoadingSlots = signal(false);
  readonly isSubmitting = signal(false);
  readonly formatDuration = formatDuration;

  private requestId = 0;
  private resetId = 0;

  ngOnChanges(changes: SimpleChanges) {
    if ((changes['open'] || changes['service']) && this.open && this.service) {
      this.reset();
    }
  }

  private async reset() {
    const resetId = ++this.resetId;
    this.step.set('datetime');
    this.selectedTime.set(null);
    this.slots.set([]);
    this.selectedDate.set(null);

    if (!this.store.hoursLoaded()) {
      try {
        await this.store.loadAllBusinessHours();
      } catch (error) {
        alerts.error(error, 'No se ha podido cargar el horario');
        return;
      }
    }
    if (resetId === this.resetId) await this.selectFirstAvailableDate(resetId);
  }

  /** Busca el primer día (en las próximas 2 semanas) con huecos libres y lo preselecciona. */
  private async selectFirstAvailableDate(resetId: number) {
    const schedule = this.store.weekSchedule();
    for (let i = 0; i < 14; i++) {
      const date = addDays(new Date(), i);
      if (schedule[mondayBasedDay(date)].isClosed) continue;
      await this.onDateSelected(toDateKey(date));
      if (this.slots().length || !this.open || resetId !== this.resetId) return;
    }
  }

  get endTime(): string {
    return this.selectedTime() && this.service ? addMinutes(this.selectedTime()!, this.service.duration) : '';
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
    if (!this.service) return;
    const id = ++this.requestId;
    this.selectedDate.set(date);
    this.selectedTime.set(null);
    this.isLoadingSlots.set(true);

    try {
      const busy = await firstValueFrom(this.appointmentService.getAvailability(date));
      if (id !== this.requestId) return; // respuesta obsoleta
      const day = this.store.weekSchedule()[mondayBasedDay(date)];
      this.slots.set(computeAvailableSlots(date, day, this.service.duration, busy));
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

  goToConfirm() {
    if (this.selectedDate() && this.selectedTime()) this.step.set('confirm');
  }

  async confirm() {
    if (!this.service?.id || !this.selectedDate() || !this.selectedTime() || this.isSubmitting()) return;
    this.isSubmitting.set(true);

    try {
      await firstValueFrom(this.appointmentService.createAppointment({
        date: this.selectedDate()!,
        startTime: this.selectedTime()!,
        endTime: this.endTime,
        serviceId: this.service.id,
      }));
      this.step.set('done');
      this.store.loadAllUserAppointments().catch(() => undefined);
    } catch (error) {
      if (error instanceof HttpErrorResponse && (error.status === 409 || error.status === 400)) {
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
