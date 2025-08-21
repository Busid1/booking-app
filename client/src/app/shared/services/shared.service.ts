import { Injectable } from '@angular/core';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { ServicesService } from '../../dashboard/admin/crud/services.service';
import { AppointmentService } from '../../booking/appointment.service';

@Injectable({ providedIn: 'root' })
export class SharedService {
  constructor(private appointmentsService: AppointmentService, private servicesService: ServicesService) { }

  private selectedServiceSubject = new BehaviorSubject<any>(null);
  selectedService$ = this.selectedServiceSubject.asObservable();

  setSelectedService(serviceId: string) {
    this.selectedServiceSubject.next(serviceId);
  }

  private userAppointmentsSubject = new BehaviorSubject<any>([]);
  userAppointments$ = this.userAppointmentsSubject.asObservable();

  async loadAllUserAppointments(): Promise<void> {
    const userAppointments = await firstValueFrom(this.appointmentsService.getUserAppointments());
    this.userAppointmentsSubject.next(userAppointments);
  }

  private appointmentsSubject = new BehaviorSubject<any>([]);
  appointments$ = this.appointmentsSubject.asObservable();

  async loadAllAppointments(): Promise<void> {
    const appointments = await firstValueFrom(this.appointmentsService.getAppointments());
    this.appointmentsSubject.next(appointments);
  }

  private allServicesSubject = new BehaviorSubject<any>([]);
  allServices$ = this.allServicesSubject.asObservable();

  async loadAllServices(): Promise<void> {
    const allServices = await firstValueFrom(this.servicesService.getServices());
    this.allServicesSubject.next(allServices);
  }

  private allBusinessHoursSubject = new BehaviorSubject<any>([]);
  allBusinessHours$ = this.allBusinessHoursSubject.asObservable();

  async loadAllBusinessHours(): Promise<void> {
    const allBusinessHours = await firstValueFrom(this.servicesService.getBusinessHours());
    this.allBusinessHoursSubject.next(allBusinessHours);
  }
}