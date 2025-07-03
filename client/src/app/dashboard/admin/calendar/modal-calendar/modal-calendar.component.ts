import { CurrencyPipe } from '@angular/common';
import { Component, Output, EventEmitter, Input } from '@angular/core';

@Component({
  selector: 'app-modal-calendar',
  templateUrl: './modal-calendar.component.html',
  styleUrls: ['./modal-calendar.component.css'],
  standalone: true,
  imports: [CurrencyPipe]
})
export class ModalCalendarComponent {
  @Output() closeModal = new EventEmitter<void>();
  @Output() deleteAppointment = new EventEmitter<string>();
  @Input() specificDate: {
    title: string;
    startTime: string;
    endTime: string;
    price: number;
    userName: string;
    dateDay: string;
    appointmentId: string;
  } = {
      title: '',
      startTime: '',
      endTime: '',
      price: 0,
      userName: '',
      dateDay: '',
      appointmentId: ''
    };

  onClose() {
    this.closeModal.emit();
  }

  onDeleteAppointment() {
    if (this.specificDate?.appointmentId) {
      this.deleteAppointment.emit(this.specificDate.appointmentId);
    }
  }
}
