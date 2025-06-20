import { Component } from '@angular/core';
import { DatePickerComponent } from './datePicker/datePicker.component';
import { AppointmentService } from './appointment.service';
import { CommonModule } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { AppointmentInterface } from '../shared/interfaces/appointment.interface';
import { ServiceInterface } from '../shared/interfaces/service.interface';
import { convertRangeToDates, toMinutes, toTimeString } from '../shared/services/time.utils';
import { ServicesService } from '../admin/crud/services.service';
import { SharedService } from '../shared/services/shared.service';
import { BusinessHoursInterface } from '../shared/interfaces/business-hours.interface';

@Component({
  selector: 'app-appointment',
  templateUrl: './appointment.component.html',
  standalone: true,
  imports: [DatePickerComponent, CommonModule]
})
export class AppointmentComponent {
  constructor(private appointmentService: AppointmentService, private servicesService: ServicesService, private sharedService: SharedService) { }
  currentStep = 1;
  
  selectedServiceId: string = ""
  selectedServiceData: ServiceInterface = {
    title: '', price: 0, duration: 0, description: '', image: ''
  };
  appointmentData: AppointmentInterface = {
    date: new Date(),
    startTime: new Date(),
    endTime: new Date(),
    serviceId: this.selectedServiceId
  };

  appointmentsAvailable: string[] = [];
  dateAppointment: string | null = null;
  dateHourAppointment: string | null = null;

  nextStep() {
    if (this.currentStep < 3) this.currentStep++;
  }

  async handleReserveAppointment(event: Event) {
    event.preventDefault();
    const token = localStorage.getItem("authToken") || "";
    await firstValueFrom(this.appointmentService.createAppointment(this.appointmentData, token));
    console.log(this.appointmentData);
    
  }

  async onDateSelected(dateStr: string) {
    this.dateAppointment = dateStr;
    this.appointmentData.date = new Date(dateStr);
    await this.loadAvailableSlots();
  }

  onHourSelected(hour: string) {
    this.dateHourAppointment = hour;
    const end = toTimeString(toMinutes(hour) + this.selectedServiceData.duration);
    const { start, end: endDate } = convertRangeToDates(this.dateAppointment!, `${hour} - ${end}`);
    this.appointmentData.startTime = start;
    this.appointmentData.endTime = endDate;
  }

  generateTimeSlots(businessHours: BusinessHoursInterface, serviceDurationMinutes: number): string[] {
    if (businessHours.isClosed) return [];

    const slots: string[] = [];

    for (const block of businessHours.timeBlocks) {
      const start = toMinutes(block.openTime);
      const end = toMinutes(block.closeTime);

      for (let time = start; time + serviceDurationMinutes <= end; time += serviceDurationMinutes) {
        slots.push(toTimeString(time));
      }
    }

    return slots;
  }

  async loadAvailableSlots() {
    const hours = await firstValueFrom(this.servicesService.getBusinessHours());
    const services = await firstValueFrom(this.servicesService.getServices());

    const selectedService = services.find(s => s.id === this.appointmentData.serviceId);
    if (!selectedService) return;
    this.selectedServiceData = selectedService;

    const dayIndex = new Date(this.dateAppointment!).getDay();
    const adjustedIndex = dayIndex === 0 ? 6 : dayIndex - 1;

    const dayHours = hours.find(h => h.dayOfWeek === adjustedIndex);
    if (!dayHours) return;

    this.appointmentsAvailable = this.generateTimeSlots(dayHours, selectedService.duration);
  }

  async ngOnInit() {
    this.sharedService.selectedService$.subscribe(async id => {
      if (!id) return;
      this.selectedServiceId = id;
      this.appointmentData.serviceId = id;

      await this.loadAvailableSlots();
    });
  }
} 
