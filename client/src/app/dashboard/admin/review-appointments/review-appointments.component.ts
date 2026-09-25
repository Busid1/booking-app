import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { CalendarComponent, SERVICE_COLORS } from '../calendar/calendar.component';
import { ModalCalendarComponent } from '../calendar/modal-calendar/modal-calendar.component';
import { ModalCreateAppointmentComponent } from '../calendar/modal-create-appointment/modal-create-appointment.component';
import { SharedService } from '../../../shared/services/shared.service';
import { AppointmentService } from '../../../booking/appointment.service';
import { AppointmentInterface } from '../../../shared/interfaces/appointment.interface';
import { addDays, fromDateKey, isPast, toDateKey, todayKey } from '../../../shared/services/time.utils';
import { alerts } from '../../../shared/services/alerts';

/** Panel de administración: métricas, agenda y calendario de citas. */
@Component({
  selector: 'app-reviewAppointments',
  imports: [CurrencyPipe, DatePipe, RouterLink, CalendarComponent, ModalCalendarComponent, ModalCreateAppointmentComponent],
  templateUrl: './review-appointments.component.html',
  standalone: true,
})
export class ReviewAppointmentsComponent implements OnInit {
  readonly store = inject(SharedService);
  private appointmentsService = inject(AppointmentService);

  readonly isLoading = signal(true);
  readonly isSyncing = signal(false);
  readonly today = todayKey();

  // Modales
  readonly detail = signal<AppointmentInterface | null>(null);
  readonly isDeleting = signal(false);
  readonly formOpen = signal(false);
  readonly formAppointment = signal<AppointmentInterface | null>(null);
  readonly formDate = signal('');
  readonly formTime = signal('');

  readonly upcoming = computed(() =>
    this.store.appointments().filter(a => !isPast(a.date, a.endTime)),
  );

  readonly stats = computed(() => {
    const all = this.store.appointments();
    const weekEnd = toDateKey(addDays(new Date(), 7));
    const month = this.today.slice(0, 7);
    const monthAppointments = all.filter(a => a.date.startsWith(month));
    return {
      today: all.filter(a => a.date === this.today).length,
      week: this.upcoming().filter(a => a.date <= weekEnd).length,
      monthRevenue: monthAppointments.reduce((sum, a) => sum + (a.service?.price ?? 0), 0),
      monthCount: monthAppointments.length,
      clients: new Set(all.map(a => a.clientName || a.userId)).size,
    };
  });

  /** Servicios más reservados (top 4) para la tarjeta de popularidad. */
  readonly topServices = computed(() => {
    const counts = new Map<string, number>();
    this.store.appointments().forEach(a => counts.set(a.serviceId, (counts.get(a.serviceId) ?? 0) + 1));
    const max = Math.max(1, ...counts.values());
    return this.store.services()
      .map((s, i) => ({ service: s, count: counts.get(s.id!) ?? 0, color: SERVICE_COLORS[i % SERVICE_COLORS.length] }))
      .filter(x => x.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 4)
      .map(x => ({ ...x, pct: Math.round((x.count / max) * 100) }));
  });

  async ngOnInit() {
    try {
      await Promise.all([
        this.store.loadAllAppointments(),
        this.store.loadAllServices(),
        this.store.loadAllBusinessHours(),
      ]);
    } catch (error) {
      alerts.error(error, 'No se han podido cargar las citas');
    } finally {
      this.isLoading.set(false);
    }
    // La sincronización con Google se hace en segundo plano para no bloquear el panel.
    this.sync(false);
  }

  async sync(notify = true) {
    this.isSyncing.set(true);
    try {
      const result = await firstValueFrom(this.appointmentsService.syncFromGoogle());
      if (result.removed) await this.store.loadAllAppointments();
      if (notify) {
        alerts.success(result.synced
          ? result.removed ? `${result.removed} cita(s) eliminadas desde Google Calendar` : 'Todo sincronizado'
          : 'Google Calendar no está configurado');
      }
    } catch (error) {
      if (notify) alerts.error(error, 'No se ha podido sincronizar con Google Calendar');
    } finally {
      this.isSyncing.set(false);
    }
  }

  asDate(key: string): Date {
    return fromDateKey(key);
  }

  openCreate(date = '', time = '') {
    this.formAppointment.set(null);
    this.formDate.set(date);
    this.formTime.set(time);
    this.formOpen.set(true);
  }

  openEdit(appointment: AppointmentInterface) {
    this.detail.set(null);
    this.formAppointment.set(appointment);
    this.formOpen.set(true);
  }

  closeForm() {
    this.formOpen.set(false);
    this.formAppointment.set(null);
  }

  async deleteAppointment(appointment: AppointmentInterface) {
    if (!appointment.id) return;
    const confirmed = await alerts.confirm({
      title: '¿Eliminar esta cita?',
      text: `${appointment.clientName || appointment.user?.name || 'Cliente'} · ${appointment.startTime}`,
      confirmText: 'Sí, eliminar',
      danger: true,
    });
    if (!confirmed) return;

    this.isDeleting.set(true);
    try {
      await firstValueFrom(this.appointmentsService.deleteAppointment(appointment.id));
      await this.store.loadAllAppointments();
      this.detail.set(null);
      alerts.success('Cita eliminada');
    } catch (error) {
      alerts.error(error, 'No se ha podido eliminar la cita');
    } finally {
      this.isDeleting.set(false);
    }
  }
}
