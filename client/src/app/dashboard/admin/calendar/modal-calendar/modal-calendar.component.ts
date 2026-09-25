import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { ModalComponent } from '../../../../shared/services/modal.component';
import { AppointmentInterface } from '../../../../shared/interfaces/appointment.interface';
import { formatDuration, fromDateKey } from '../../../../shared/services/time.utils';

/** Detalle de una cita (solo lectura) con acciones de editar y eliminar. */
@Component({
  selector: 'app-modal-calendar',
  templateUrl: './modal-calendar.component.html',
  standalone: true,
  imports: [CurrencyPipe, DatePipe, ModalComponent],
})
export class ModalCalendarComponent {
  @Input() open = false;
  @Input() appointment: AppointmentInterface | null = null;
  @Input() isDeleting = false;

  @Output() closeModal = new EventEmitter<void>();
  @Output() editAppointment = new EventEmitter<AppointmentInterface>();
  @Output() deleteAppointment = new EventEmitter<AppointmentInterface>();

  readonly formatDuration = formatDuration;

  asDate(key: string): Date {
    return fromDateKey(key);
  }
}
