import { Component, Input } from '@angular/core';
import { TimePickerComponent } from '../../business/business-hours/timePicker/timePicker.component';
import { TimeBlock } from '../interfaces/business-hours.interface';
import { DAY_NAMES } from './time.utils';

export interface DayForm {
  isClosed: boolean;
  timeBlocks: TimeBlock[];
}

export function isBlockInvalid(block: TimeBlock): boolean {
  return !block.openTime || !block.closeTime || block.openTime >= block.closeTime;
}

/** Devuelve un mensaje de error si el horario semanal no es válido. */
export function validateWeek(days: DayForm[]): string | null {
  for (const [i, day] of days.entries()) {
    if (day.isClosed) continue;
    if (day.timeBlocks.some(isBlockInvalid)) return `${DAY_NAMES[i]}: la hora de apertura debe ser anterior a la de cierre.`;
    const sorted = [...day.timeBlocks].sort((a, b) => a.openTime.localeCompare(b.openTime));
    if (sorted.some((b, j) => j > 0 && b.openTime < sorted[j - 1].closeTime)) return `${DAY_NAMES[i]}: hay tramos horarios que se solapan.`;
  }
  return null;
}

/** Editor de horario semanal (lunes a domingo) que modifica el array recibido. */
@Component({
  selector: 'app-week-hours-editor',
  standalone: true,
  imports: [TimePickerComponent],
  template: `
    <div class="mb-3 flex justify-end">
      <button type="button" class="btn btn-ghost btn-sm" (click)="copyMondayToWeekdays()"><i class="fas fa-copy"></i> Copiar lunes a días laborables</button>
    </div>
    <div class="space-y-2.5">
      @for (day of days; track $index; let i = $index) {
        <div class="rounded-2xl border p-3.5 transition" [class]="day.isClosed ? 'border-slate-200 bg-slate-50' : 'border-brand-100 bg-white'">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <h4 class="w-24 font-bold">{{ dayNames[i] }}</h4>
            <button type="button" role="switch" [attr.aria-checked]="!day.isClosed" (click)="toggleClosed(day)"
              class="flex items-center gap-2.5 text-sm font-semibold" [class]="day.isClosed ? 'text-slate-500' : 'text-accent-700'">
              <span class="relative h-6 w-11 rounded-full transition" [class]="day.isClosed ? 'bg-slate-300' : 'bg-accent-500'">
                <span class="absolute top-0.5 size-5 rounded-full bg-white shadow transition-all" [class]="day.isClosed ? 'left-0.5' : 'left-[1.375rem]'"></span>
              </span>
              {{ day.isClosed ? 'Libre' : 'Trabaja' }}
            </button>
          </div>
          @if (!day.isClosed) {
            <div class="mt-3 flex flex-wrap items-end gap-3">
              @for (block of day.timeBlocks; track $index; let x = $index) {
                <div class="flex items-end gap-2 rounded-xl bg-slate-50 p-2.5">
                  <app-timePicker label="Desde" [value]="block.openTime" [invalid]="isInvalid(block)" (timeChanged)="block.openTime = $event" />
                  <span class="pb-2.5 text-slate-400">–</span>
                  <app-timePicker label="Hasta" [value]="block.closeTime" [invalid]="isInvalid(block)" (timeChanged)="block.closeTime = $event" />
                  <button type="button" class="btn-icon mb-0.5 text-rose-500 hover:bg-rose-50 hover:text-rose-600" (click)="removeBlock(day, x)" aria-label="Quitar tramo">
                    <i class="fas fa-trash-can text-sm"></i>
                  </button>
                </div>
              }
              <button type="button" class="btn btn-secondary btn-sm mb-2.5" (click)="addBlock(day)"><i class="fas fa-plus"></i> Tramo</button>
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class WeekHoursEditorComponent {
  @Input({ required: true }) days: DayForm[] = [];
  readonly dayNames = DAY_NAMES;
  readonly isInvalid = isBlockInvalid;

  toggleClosed(day: DayForm) {
    day.isClosed = !day.isClosed;
    if (!day.isClosed && !day.timeBlocks.length) day.timeBlocks.push({ openTime: '09:00', closeTime: '14:00' });
  }

  addBlock(day: DayForm) {
    day.timeBlocks.push(day.timeBlocks.length ? { openTime: '16:00', closeTime: '20:00' } : { openTime: '09:00', closeTime: '14:00' });
  }

  removeBlock(day: DayForm, index: number) {
    day.timeBlocks.splice(index, 1);
    if (!day.timeBlocks.length) day.isClosed = true;
  }

  copyMondayToWeekdays() {
    const monday = this.days[0];
    for (let i = 1; i < 5; i++) this.days[i] = { isClosed: monday.isClosed, timeBlocks: monday.timeBlocks.map(b => ({ ...b })) };
  }
}
