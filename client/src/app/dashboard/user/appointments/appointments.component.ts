import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { SharedService } from '../../../shared/services/shared.service';
import { AppointmentService } from '../../../booking/appointment.service';
import { AppointmentInterface } from '../../../shared/interfaces/appointment.interface';
import { formatDuration, fromDateKey, isPast, todayKey } from '../../../shared/services/time.utils';
import { alerts } from '../../../shared/services/alerts';

type Tab = 'upcoming' | 'past';

@Component({
  selector: 'app-appointments',
  templateUrl: './appointments.component.html',
  standalone: true,
  imports: [CurrencyPipe, DatePipe, RouterLink],
})
export class AppointmentsComponent implements OnInit {
  private store = inject(SharedService);
  private appointmentsService = inject(AppointmentService);

  readonly isLoading = signal(true);
  readonly loadError = signal(false);
  readonly tab = signal<Tab>('upcoming');
  readonly cancellingId = signal<string | null>(null);
  readonly formatDuration = formatDuration;
  readonly today = todayKey();

  readonly upcoming = computed(() =>
    this.store.userAppointments().filter(a => !isPast(a.date, a.endTime)),
  );
  readonly past = computed(() =>
    this.store.userAppointments().filter(a => isPast(a.date, a.endTime)).reverse(),
  );
  readonly visible = computed(() => (this.tab() === 'upcoming' ? this.upcoming() : this.past()));
  readonly nextAppointment = computed(() => this.upcoming()[0] ?? null);

  async ngOnInit() {
    await this.load();
  }

  async load() {
    this.loadError.set(false);
    this.isLoading.set(true);
    try {
      await this.store.loadAllUserAppointments();
    } catch {
      this.loadError.set(true);
    } finally {
      this.isLoading.set(false);
    }
  }

  asDate(key: string): Date {
    return fromDateKey(key);
  }

  canCancel(appointment: AppointmentInterface): boolean {
    return !isPast(appointment.date, appointment.startTime);
  }

  async cancel(appointment: AppointmentInterface) {
    if (!appointment.id) return;

    const confirmed = await alerts.confirm({
      title: '¿Cancelar esta cita?',
      text: `${appointment.service?.title ?? 'Cita'} · ${appointment.date.split('-').reverse().join('/')} a las ${appointment.startTime}`,
      confirmText: 'Sí, cancelar',
      cancelText: 'Mantener',
      danger: true,
    });
    if (!confirmed) return;

    this.cancellingId.set(appointment.id);
    try {
      await firstValueFrom(this.appointmentsService.deleteAppointment(appointment.id));
      this.store.userAppointments.update(list => list.filter(a => a.id !== appointment.id));
      alerts.success('Cita cancelada');
    } catch (error) {
      alerts.error(error, 'No se ha podido cancelar la cita');
    } finally {
      this.cancellingId.set(null);
    }
  }
}
