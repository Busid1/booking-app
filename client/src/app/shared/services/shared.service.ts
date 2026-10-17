import { computed, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ServicesService } from '../../dashboard/admin/crud/services.service';
import { AppointmentService } from '../../booking/appointment.service';
import { ServiceInterface } from '../interfaces/service.interface';
import { AppointmentInterface } from '../interfaces/appointment.interface';
import { BusinessHoursInterface } from '../interfaces/business-hours.interface';
import { BusinessInfoInterface, PublicConfig } from '../interfaces/business-info.interface';
import { StaffInterface } from '../interfaces/staff.interface';
import { ReviewsSummary } from '../interfaces/review.interface';
import { mondayBasedDay, nowTime, toMinutes } from './time.utils';
import { applyBrandColor } from './theme';

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
    applyBrandColor(info?.primaryColor);
  }

  // --- Equipo ---
  readonly staff = signal<StaffInterface[]>([]);
  readonly staffLoaded = signal(false);

  async loadStaff(): Promise<void> {
    this.staff.set(await firstValueFrom(this.servicesApi.getStaff()));
    this.staffLoaded.set(true);
  }

  /**
   * Profesionales que realizan un servicio: los asignados y los que no tienen servicios
   * marcados (hacen todos). Si nadie lo tiene asignado, todos. Igual que en el servidor.
   */
  staffForService(serviceId: string | undefined): StaffInterface[] {
    const all = this.staff();
    const assigned = all.filter(s => serviceId && s.serviceIds.includes(serviceId));
    return assigned.length ? all.filter(s => !s.serviceIds.length || assigned.includes(s)) : all;
  }

  // --- Reseñas ---
  readonly reviews = signal<ReviewsSummary>({ average: null, count: 0, reviews: [] });

  async loadReviews(): Promise<void> {
    this.reviews.set(await firstValueFrom(this.servicesApi.getReviews()));
  }

  // --- Configuración pública (claves públicas, funciones activas) ---
  readonly config = signal<PublicConfig | null>(null);

  async loadConfig(): Promise<PublicConfig | null> {
    if (this.config()) return this.config();
    try {
      this.config.set(await firstValueFrom(this.servicesApi.getConfig()));
    } catch {
      this.config.set({ turnstileSiteKey: null, payments: false, email: false, googleCalendar: false, timeZone: 'Europe/Madrid' });
    }
    return this.config();
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
