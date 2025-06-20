import { Component, Input, Output, EventEmitter } from '@angular/core';
import { ServiceInterface } from '../../shared/interfaces/service.interface';
import { CurrencyPipe } from '@angular/common';

@Component({
  selector: 'app-datePicker',
  templateUrl: './datePicker.component.html',
  standalone: true,
  imports: [CurrencyPipe]
})
export class DatePickerComponent {
  @Input() appointmentsAvailable: string[] = [];
  @Input() dateAppointment: string | null = null;
  @Input() selectedServiceData!: ServiceInterface;
  @Input() dateHourAppointment: string | null = null;

  @Output() dateSelected = new EventEmitter<string>();
  @Output() hourSelected = new EventEmitter<string>();

  handleDateChange(event: Event) {
    const input = event.target as HTMLInputElement;
    this.dateSelected.emit(input.value);
  }

  handleSelectedHourDate(hour: string) {
    this.hourSelected.emit(hour);
  }

  getAppointmentRange(): string {
    const start = this.dateHourAppointment;
    if (!this.dateAppointment || !start || !this.selectedServiceData?.duration) return '';

    const startMinutes = Number(start.split(':')[0]) * 60 + Number(start.split(':')[1]);
    const endMinutes = startMinutes + this.selectedServiceData.duration;
    const end = `${String(Math.floor(endMinutes / 60)).padStart(2, '0')}:${String(endMinutes % 60).padStart(2, '0')}`;

    return `${start} - ${end}`;
  }
}