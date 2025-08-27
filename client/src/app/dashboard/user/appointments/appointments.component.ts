import { Component } from '@angular/core';
import { SharedService } from '../../../shared/services/shared.service';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { calculateEndTime } from '../../../shared/services/time.utils';
import { firstValueFrom } from 'rxjs';
import { AppointmentService } from '../../../booking/appointment.service';

@Component({
  selector: 'app-appointments',
  templateUrl: './appointments.component.html',
  styleUrls: ['./appointments.component.css'],
  standalone: true,
  imports: [CurrencyPipe, CommonModule]
})
export class AppointmentsComponent {
  constructor(private sharedService: SharedService, private appointmentsService: AppointmentService) { }
  appointmentsData: any = [];
  isLoading: boolean = false;

  async ngOnInit() {
    this.isLoading = true;
    if(!this.appointmentsData.length) this.isLoading = false;
    await this.sharedService.loadAllUserAppointments();
    this.sharedService.userAppointments$.subscribe(data => {
      const correctAppointments = data.map((appointment: any) => {
        if (!appointment.endTime) {
          const start = new Date(`${appointment.date}T${appointment.startTime}`);
          appointment.endTime = calculateEndTime(start, appointment.service.duration)
        }

        return appointment
      })
      this.appointmentsData = correctAppointments;
      this.isLoading = false;
    });
  }

  async handleDeleteAppointment(appointmentId: string) {
    if (!appointmentId) return;
    this.appointmentsData = this.appointmentsData.filter((appointment: any) => appointment.id !== appointmentId)
    try {
      await firstValueFrom(this.appointmentsService.deleteAppointment(appointmentId))
    } catch (error) {
      console.log(error)
    }
  }
}
