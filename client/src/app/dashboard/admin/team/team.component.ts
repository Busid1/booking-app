import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { ServicesService } from '../crud/services.service';
import { SharedService } from '../../../shared/services/shared.service';
import { ModalComponent } from '../../../shared/services/modal.component';
import { StaffAvatarComponent } from '../../../shared/services/staff-avatar.component';
import { DayForm, validateWeek, WeekHoursEditorComponent } from '../../../shared/services/week-hours-editor.component';
import { StaffAdmin, StaffPayload } from '../../../shared/interfaces/staff.interface';
import { alerts } from '../../../shared/services/alerts';

export const STAFF_COLORS = ['#4f46e5', '#e11d48', '#059669', '#d97706', '#0891b2', '#7c3aed', '#db2777', '#65a30d', '#0f172a'];

interface StaffForm extends StaffPayload {
  days: DayForm[];
}

/** Gestión del equipo: profesionales, servicios que realizan, horario y acceso. */
@Component({
  selector: 'app-team',
  standalone: true,
  imports: [FormsModule, ModalComponent, StaffAvatarComponent, WeekHoursEditorComponent],
  templateUrl: './team.component.html',
})
export default class TeamComponent implements OnInit {
  private api = inject(ServicesService);
  readonly store = inject(SharedService);

  readonly staff = signal<StaffAdmin[]>([]);
  readonly isLoading = signal(true);
  readonly isSaving = signal(false);
  readonly uploadingId = signal<string | null>(null);
  readonly editing = signal<StaffAdmin | null>(null);
  readonly formOpen = signal(false);
  readonly colors = STAFF_COLORS;
  form: StaffForm = this.emptyForm();

  async ngOnInit() {
    await Promise.all([this.load(), this.store.loadAllServices().catch(() => undefined), this.store.loadAllBusinessHours().catch(() => undefined)]);
  }

  async load() {
    try {
      this.staff.set(await firstValueFrom(this.api.getStaffAdmin()));
    } catch (error) {
      alerts.error(error, 'No se ha podido cargar el equipo');
    } finally {
      this.isLoading.set(false);
    }
  }

  private businessDays(): DayForm[] {
    return this.store.weekSchedule().map(d => ({ isClosed: d.isClosed, timeBlocks: d.timeBlocks.map(b => ({ ...b })) }));
  }

  private emptyForm(): StaffForm {
    return {
      name: '', bio: '', color: STAFF_COLORS[this.staff?.()?.length % STAFF_COLORS.length || 0], active: true,
      useBusinessHours: true, calendarId: '', serviceIds: [], accessEmail: '', hours: [], days: [],
    };
  }

  openCreate() {
    this.editing.set(null);
    this.form = { ...this.emptyForm(), days: this.businessDays() };
    this.formOpen.set(true);
  }

  openEdit(member: StaffAdmin) {
    this.editing.set(member);
    const days = member.useBusinessHours || !member.hours.length
      ? this.businessDays()
      : Array.from({ length: 7 }, (_, day) => {
          const h = member.hours.find(x => x.dayOfWeek === day);
          return { isClosed: !h || h.isClosed, timeBlocks: (h?.timeBlocks ?? []).map(b => ({ ...b })) };
        });
    this.form = {
      name: member.name, bio: member.bio ?? '', color: member.color, active: member.active, useBusinessHours: member.useBusinessHours,
      calendarId: member.calendarId ?? '', serviceIds: [...member.serviceIds], accessEmail: member.accessEmail, hours: member.hours, days,
    };
    this.formOpen.set(true);
  }

  toggleService(id: string) {
    const ids = this.form.serviceIds;
    this.form.serviceIds = ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id];
  }

  async save() {
    if (!this.form.name.trim()) {
      alerts.warning('Indica el nombre del profesional');
      return;
    }
    if (!this.form.useBusinessHours) {
      const error = validateWeek(this.form.days);
      if (error) {
        alerts.warning('Revisa el horario', error);
        return;
      }
    }
    const { days, ...rest } = this.form;
    const payload: StaffPayload = {
      ...rest,
      name: rest.name.trim(),
      bio: rest.bio?.trim() ?? '',
      calendarId: rest.calendarId?.trim() ?? '',
      accessEmail: rest.accessEmail.trim(),
      hours: rest.useBusinessHours
        ? []
        : days.map((d, dayOfWeek) => ({ dayOfWeek, isClosed: d.isClosed || !d.timeBlocks.length, timeBlocks: d.isClosed ? [] : d.timeBlocks })),
    };

    this.isSaving.set(true);
    try {
      const current = this.editing();
      if (current) await firstValueFrom(this.api.updateStaff(current.id, payload));
      else await firstValueFrom(this.api.createStaff(payload));
      await Promise.all([this.load(), this.store.loadStaff()]);
      alerts.success(current ? 'Profesional actualizado' : 'Profesional añadido');
      this.formOpen.set(false);
    } catch (error) {
      alerts.error(error, 'No se ha podido guardar');
    } finally {
      this.isSaving.set(false);
    }
  }

  async uploadPhoto(member: StaffAdmin, event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/') || file.size > 5 * 1024 * 1024) {
      alerts.warning('Selecciona una imagen de menos de 5 MB');
      return;
    }
    this.uploadingId.set(member.id);
    try {
      await firstValueFrom(this.api.uploadStaffPhoto(member.id, file));
      await Promise.all([this.load(), this.store.loadStaff()]);
      alerts.success('Foto actualizada');
    } catch (error) {
      alerts.error(error, 'No se ha podido subir la foto');
    } finally {
      this.uploadingId.set(null);
    }
  }

  async remove(member: StaffAdmin) {
    const ok = await alerts.confirm({
      title: `¿Eliminar a ${member.name}?`,
      text: 'Sus citas se conservarán, pero quedarán sin profesional asignado. Si solo quieres ocultarlo, desactívalo.',
      confirmText: 'Sí, eliminar',
      danger: true,
    });
    if (!ok) return;
    try {
      await firstValueFrom(this.api.deleteStaff(member.id));
      await Promise.all([this.load(), this.store.loadStaff()]);
      alerts.success('Profesional eliminado');
    } catch (error) {
      alerts.error(error, 'No se ha podido eliminar');
    }
  }

  bookingLink(member: StaffAdmin): string {
    return `${location.origin}/reservar/${member.slug}`;
  }

  copyLink(member: StaffAdmin) {
    const url = this.bookingLink(member);
    navigator.clipboard?.writeText(url).then(() => alerts.success('Enlace copiado')).catch(() => alerts.info(url));
  }

  serviceNames(member: StaffAdmin): string {
    if (!member.serviceIds.length) return 'Todos los servicios';
    return this.store.services().filter(s => member.serviceIds.includes(s.id!)).map(s => s.title).join(', ') || 'Todos los servicios';
  }
}
