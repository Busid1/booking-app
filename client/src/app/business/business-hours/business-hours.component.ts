import { Component, EventEmitter, inject, Input, OnChanges, Output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { ServicesService } from '../../dashboard/admin/crud/services.service';
import { SharedService } from '../../shared/services/shared.service';
import { TimePickerComponent } from './timePicker/timePicker.component';
import { ModalComponent } from '../../shared/services/modal.component';
import { BusinessHoursInterface, TimeBlock } from '../../shared/interfaces/business-hours.interface';
import { DAY_NAMES } from '../../shared/services/time.utils';
import { alerts } from '../../shared/services/alerts';

interface DayForm {
  isClosed: boolean;
  timeBlocks: TimeBlock[];
}

/** Editor del horario semanal (modal) para el administrador. */
@Component({
  selector: 'app-business-hours',
  templateUrl: './business-hours.component.html',
  imports: [FormsModule, TimePickerComponent, ModalComponent],
  standalone: true,
})
export class BusinessHoursComponent implements OnChanges {
  private api = inject(ServicesService);
  private store = inject(SharedService);

  @Input() open = false;
  @Output() closed = new EventEmitter<void>();

  readonly dayNames = DAY_NAMES;
  readonly isSaving = signal(false);
  days: DayForm[] = [];

  ngOnChanges() {
    if (this.open) this.resetForm();
  }

  private resetForm() {
    this.days = this.store.weekSchedule().map(d => ({
      isClosed: d.isClosed,
      timeBlocks: d.timeBlocks.map(b => ({ openTime: b.openTime, closeTime: b.closeTime })),
    }));
  }

  toggleClosed(day: DayForm) {
    day.isClosed = !day.isClosed;
    if (!day.isClosed && !day.timeBlocks.length) day.timeBlocks.push({ openTime: '09:00', closeTime: '14:00' });
  }

  addBlock(day: DayForm) {
    const last = day.timeBlocks[day.timeBlocks.length - 1];
    day.timeBlocks.push(last ? { openTime: '16:00', closeTime: '20:00' } : { openTime: '09:00', closeTime: '14:00' });
  }

  removeBlock(day: DayForm, index: number) {
    day.timeBlocks.splice(index, 1);
    if (!day.timeBlocks.length) day.isClosed = true;
  }

  /** Copia el horario del lunes al resto de días laborables. */
  copyMondayToWeekdays() {
    const monday = this.days[0];
    for (let i = 1; i < 5; i++) {
      this.days[i] = { isClosed: monday.isClosed, timeBlocks: monday.timeBlocks.map(b => ({ ...b })) };
    }
  }

  isBlockInvalid(block: TimeBlock): boolean {
    return !block.openTime || !block.closeTime || block.openTime >= block.closeTime;
  }

  private validate(): string | null {
    for (const [i, day] of this.days.entries()) {
      if (day.isClosed) continue;
      if (day.timeBlocks.some(b => this.isBlockInvalid(b))) {
        return `${this.dayNames[i]}: la hora de apertura debe ser anterior a la de cierre.`;
      }
      const sorted = [...day.timeBlocks].sort((a, b) => a.openTime.localeCompare(b.openTime));
      if (sorted.some((b, j) => j > 0 && b.openTime < sorted[j - 1].closeTime)) {
        return `${this.dayNames[i]}: hay tramos horarios que se solapan.`;
      }
    }
    return null;
  }

  async save() {
    const error = this.validate();
    if (error) {
      alerts.warning('Revisa el horario', error);
      return;
    }

    const payload: BusinessHoursInterface[] = this.days.map((day, dayOfWeek) => ({
      dayOfWeek,
      isClosed: day.isClosed || day.timeBlocks.length === 0,
      timeBlocks: day.isClosed ? [] : day.timeBlocks,
    }));

    this.isSaving.set(true);
    try {
      await firstValueFrom(this.api.saveBusinessHours(payload));
      await this.store.loadAllBusinessHours();
      alerts.success('Horario guardado');
      this.closed.emit();
    } catch (err) {
      alerts.error(err, 'No se ha podido guardar el horario');
    } finally {
      this.isSaving.set(false);
    }
  }
}
