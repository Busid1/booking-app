import { Component } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { CalendarComponent } from '../calendar/calendar.component';
import { SharedService } from '../../../shared/services/shared.service';

@Component({
  selector: 'app-reviewAppointments',
  standalone: true,
  imports: [CurrencyPipe, CalendarComponent],
  templateUrl: './review-appointments.component.html',
  styleUrl: './review-appointments.component.scss'
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