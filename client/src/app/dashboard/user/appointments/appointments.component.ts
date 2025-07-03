import { Component, OnInit } from '@angular/core';
import { SharedService } from '../../../shared/services/shared.service';
import { CurrencyPipe } from '@angular/common';

@Component({
  selector: 'app-appointments',
  templateUrl: './appointments.component.html',
  styleUrls: ['./appointments.component.css'],
  standalone: true,
  imports: [CurrencyPipe]
})
export class AppointmentsComponent{
  constructor(private sharedService: SharedService) { }
  appointmentsData: any = []

  async ngOnInit() {
    await this.sharedService.loadAllUserAppointments();
    this.sharedService.userAppointments$.subscribe(data => {
      this.appointmentsData = data;
    });
    console.log(this.appointmentsData);
    
  }

}
