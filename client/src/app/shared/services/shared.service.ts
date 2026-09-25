import { computed, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ServicesService } from '../../dashboard/admin/crud/services.service';
import { AppointmentService } from '../../booking/appointment.service';
import { ServiceInterface } from '../interfaces/service.interface';
import { AppointmentInterface } from '../interfaces/appointment.interface';
import { BusinessHoursInterface } from '../interfaces/business-hours.interface';
import { BusinessInfoInterface } from '../interfaces/business-info.interface';
import { mondayBasedDay, nowTime, toMinutes } from './time.utils';

const EMPTY_INFO: BusinessInfoInterface = { name: '', description: '', address: '', phone: '', email: '', images: [] };

/** Estado compartido de la aplicación basado en signals. */
@Injectable({ providedIn: 'root' })
export class SharedService {
  private servicesApi = inject(ServicesService);
  private appointmentsApi = inject(AppointmentService);

  // --- Servicios ---
  readonly services = signal<ServiceInterface[]>([]);
  readonly servicesLoaded = signal(false);

  async loadAllServices(): Promise<void> {
    const services = await firstValueFrom(this.servicesApi.getServices());
    this.services.set(services);
    this.servicesLoaded.set(true);
  }

  // --- Horario ---
  readonly businessHours = signal<BusinessHoursInterface[]>([]);
  readonly hoursLoaded = signal(false);

  /** Horario de los 7 días (lunes a domingo), rellenando días sin configurar como cerrados. */
  readonly weekSchedule = computed<BusinessHoursInterface[]>(() =>
    Array.from({ length: 7 }, (_, day) => {
      const found = this.businessHours().find(h => h.dayOfWeek === day);
      const blocks = found?.timeBlocks ?? [];
      return { dayOfWeek: day, isClosed: !found || found.isClosed || blocks.length === 0, timeBlocks: blocks };
    }),
  );

  async loadAllBusinessHours(): Promise<void> {
    const hours = await firstValueFrom(this.servicesApi.getBusinessHours());
    this.businessHours.set(hours);
    this.hoursLoaded.set(true);
  }

  /** Devuelve si el negocio está abierto ahora y, si no, cuándo abre/cierra. */
  openStatus(): { open: boolean; label: string } {
    const schedule = this.weekSchedule();
    if (!this.hoursLoaded()) return { open: false, label: '' };
    const today = schedule[mondayBasedDay(new Date())];
    const now = toMinutes(nowTime());

    if (!today.isClosed) {
      const current = today.timeBlocks.find(b => toMinutes(b.openTime) <= now && now < toMinutes(b.closeTime));
      if (current) return { open: true, label: `Abierto · cierra a las ${current.closeTime}` };
      const next = today.timeBlocks.find(b => toMinutes(b.openTime) > now);
      if (next) return { open: false, label: `Cerrado · abre hoy a las ${next.openTime}` };
    }
    return { open: false, label: 'Cerrado ahora' };
  }

  // --- Información del negocio ---
  readonly businessInfo = signal<BusinessInfoInterface>(EMPTY_INFO);
  readonly infoLoaded = signal(false);

  async loadBusinessInfo(): Promise<void> {
    const response = await firstValueFrom(this.servicesApi.getBusinessInfo());
    const info = response[0];
    this.businessInfo.set(info ? { ...info, images: (info.images ?? []).filter(Boolean) } : EMPTY_INFO);
    this.infoLoaded.set(true);
  }

  // --- Citas ---
  readonly appointments = signal<AppointmentInterface[]>([]);
  readonly userAppointments = signal<AppointmentInterface[]>([]);

  async loadAllAppointments(): Promise<void> {
    this.appointments.set(await firstValueFrom(this.appointmentsApi.getAppointments()));
  }

  async loadAllUserAppointments(): Promise<void> {
    this.userAppointments.set(await firstValueFrom(this.appointmentsApi.getUserAppointments()));
  }
}
