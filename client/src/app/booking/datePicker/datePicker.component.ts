import { Component, ElementRef, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { DatePipe } from '@angular/common';
import { BusinessHoursInterface } from '../../shared/interfaces/business-hours.interface';
import { addDays, fromDateKey, mondayBasedDay, toDateKey } from '../../shared/services/time.utils';
import { groupSlotsByPeriod } from '../booking.utils';

export const BOOKING_WINDOW_DAYS = 60;

interface DayOption {
  key: string;
  date: Date;
  closed: boolean;
}

/** Selector de día (tira horizontal) y de hora (huecos agrupados por franja). */
@Component({
  selector: 'app-datePicker',
  templateUrl: './datePicker.component.html',
  standalone: true,
  imports: [DatePipe],
})
export class DatePickerComponent {
  @Input({ required: true }) schedule: BusinessHoursInterface[] = [];
  @Input() selectedDate: string | null = null;
  @Input() selectedTime: string | null = null;
  @Input() isLoadingSlots = false;
  @Input() set slots(value: string[]) {
    this.groups = groupSlotsByPeriod(value);
    this.slotCount = value.length;
  }

  @Output() dateSelected = new EventEmitter<string>();
  @Output() hourSelected = new EventEmitter<string>();

  @ViewChild('strip') strip?: ElementRef<HTMLDivElement>;

  groups: ReturnType<typeof groupSlotsByPeriod> = [];
  slotCount = 0;

  readonly minDate = toDateKey(new Date());
  readonly maxDate = toDateKey(addDays(new Date(), BOOKING_WINDOW_DAYS));

  get dayOptions(): DayOption[] {
    if (this._daysCache?.schedule === this.schedule) return this._daysCache.days;
    const today = new Date();
    const days = Array.from({ length: BOOKING_WINDOW_DAYS }, (_, i) => {
      const date = addDays(today, i);
      const day = this.schedule[mondayBasedDay(date)];
      return { key: toDateKey(date), date, closed: !day || day.isClosed };
    });
    this._daysCache = { schedule: this.schedule, days };
    return days;
  }
  private _daysCache?: { schedule: BusinessHoursInterface[]; days: DayOption[] };

  isOutsideStrip(): boolean {
    return !!this.selectedDate && !this.dayOptions.some(d => d.key === this.selectedDate);
  }

  selectedDateObj(): Date | null {
    return this.selectedDate ? fromDateKey(this.selectedDate) : null;
  }

  scrollStrip(direction: 1 | -1) {
    const el = this.strip?.nativeElement;
    el?.scrollBy({ left: direction * el.clientWidth * 0.8, behavior: 'smooth' });
  }

  onCustomDate(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    if (value) this.dateSelected.emit(value);
  }
}
