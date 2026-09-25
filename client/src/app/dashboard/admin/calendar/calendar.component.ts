import { Component, computed, EventEmitter, inject, Output, signal } from '@angular/core';
import { FullCalendarModule } from '@fullcalendar/angular';
import { CalendarOptions, EventClickArg, EventInput } from '@fullcalendar/core';
import esLocale from '@fullcalendar/core/locales/es';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin, { DateClickArg } from '@fullcalendar/interaction';
import { SharedService } from '../../../shared/services/shared.service';
import { AppointmentInterface } from '../../../shared/interfaces/appointment.interface';
import { toDateKey, toTimeString, todayKey } from '../../../shared/services/time.utils';

export const SERVICE_COLORS = ['#4f46e5', '#059669', '#d97706', '#db2777', '#0891b2', '#7c3aed', '#dc2626', '#65a30d'];

/** Calendario de citas (FullCalendar). Emite eventos para que el panel gestione los modales. */
@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [FullCalendarModule],
  templateUrl: './calendar.component.html',
  styleUrl: './calendar.component.scss',
})
export class CalendarComponent {
  private store = inject(SharedService);

  @Output() createAt = new EventEmitter<{ date: string; time: string }>();
  @Output() selectAppointment = new EventEmitter<AppointmentInterface>();

  private readonly isMobile = signal(window.innerWidth < 640);

  /** Color estable por servicio. */
  readonly serviceColor = computed(() => {
    const map = new Map<string, string>();
    this.store.services().forEach((s, i) => map.set(s.id!, SERVICE_COLORS[i % SERVICE_COLORS.length]));
    return map;
  });

  private readonly events = computed<EventInput[]>(() =>
    this.store.appointments().map(app => {
      const color = this.serviceColor().get(app.serviceId) ?? SERVICE_COLORS[0];
      return {
        id: app.id,
        title: `${app.clientName || app.user?.name || 'Cliente'} · ${app.service?.title ?? 'Cita'}`,
        start: `${app.date}T${app.startTime}`,
        end: `${app.date}T${app.endTime}`,
        backgroundColor: color,
        borderColor: color,
        extendedProps: { appointment: app },
      };
    }),
  );

  /** Resalta el horario de apertura en las vistas semanal y diaria. */
  private readonly businessHours = computed(() =>
    this.store.weekSchedule().flatMap(day =>
      day.isClosed
        ? []
        : day.timeBlocks.map(b => ({ daysOfWeek: [(day.dayOfWeek + 1) % 7], startTime: b.openTime, endTime: b.closeTime })),
    ),
  );

  readonly calendarOptions = computed<CalendarOptions>(() => ({
    plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin],
    locale: esLocale,
    initialView: this.isMobile() ? 'listWeek' : 'dayGridMonth',
    firstDay: 1,
    height: 'auto',
    nowIndicator: true,
    slotMinTime: '07:00:00',
    slotMaxTime: '23:00:00',
    slotDuration: '00:30:00',
    allDaySlot: false,
    dayMaxEvents: 3,
    eventTimeFormat: { hour: '2-digit', minute: '2-digit', hour12: false },
    slotLabelFormat: { hour: '2-digit', minute: '2-digit', hour12: false },
    headerToolbar: this.isMobile()
      ? { left: 'prev,next', center: 'title', right: 'today' }
      : { left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek' },
    footerToolbar: this.isMobile() ? { center: 'dayGridMonth,timeGridWeek,listWeek' } : undefined,
    businessHours: this.businessHours(),
    events: this.events(),
    dayCellClassNames: arg => (toDateKey(arg.date) < todayKey() ? ['fc-day-disabled-past'] : []),
    dateClick: (arg: DateClickArg) => this.handleDateClick(arg),
    eventClick: (arg: EventClickArg) => this.handleEventClick(arg),
  }));

  private handleDateClick(arg: DateClickArg) {
    const date = toDateKey(arg.date);
    if (date < todayKey()) return;
    const time = arg.allDay ? '' : toTimeString(arg.date.getHours() * 60 + arg.date.getMinutes());
    this.createAt.emit({ date, time });
  }

  private handleEventClick(info: EventClickArg) {
    info.jsEvent.preventDefault();
    document.querySelector('.fc-popover')?.remove();
    const appointment = info.event.extendedProps['appointment'] as AppointmentInterface | undefined;
    if (appointment) this.selectAppointment.emit(appointment);
  }
}
