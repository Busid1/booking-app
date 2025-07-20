import { Component } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { CalendarComponent } from '../calendar/calendar.component';
import { SharedService } from '../../../shared/services/shared.service';

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

  async ngOnInit() {
    await this.sharedService.loadAllAppointments();
    this.sharedService.appointments$.subscribe(data => {
      this.appointmentsData = data;
    });
  }
}