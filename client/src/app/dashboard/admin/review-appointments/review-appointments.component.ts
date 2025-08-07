import { Component } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { CalendarComponent } from '../calendar/calendar.component';
import { SharedService } from '../../../shared/services/shared.service';
import { calculateEndTime } from '../../../shared/services/time.utils';

@Component({
  selector: 'app-reviewAppointments',
  imports: [CurrencyPipe, CommonModule, CalendarComponent],
  templateUrl: './review-appointments.component.html',
  styleUrl: './review-appointments.component.scss',
  standalone: true,
})

export class ReviewAppointmentsComponent {
  constructor(private sharedService: SharedService) { }
  appointmentsData: any = []
  isLoading: boolean = false;

  async ngOnInit() {
    this.isLoading = true
    await this.sharedService.loadAllAppointments();

    this.sharedService.appointments$.subscribe(data => {
      const correctAppointments = data.map((appointment: any) => {
        if (!appointment.endTime) {
          const start = new Date(`${appointment.date}T${appointment.startTime}`);
          appointment.endTime = calculateEndTime(start, appointment.service.duration)
        }

        return appointment
      })
      this.appointmentsData = correctAppointments;
      this.isLoading = false
    });
  }
}