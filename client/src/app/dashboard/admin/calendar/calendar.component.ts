import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CalendarOptions, EventClickArg } from '@fullcalendar/core';
import { FullCalendarModule } from '@fullcalendar/angular';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import { Modal } from 'flowbite';
import { ModalCalendarComponent } from "./modal-calendar/modal-calendar.component";
import { firstValueFrom } from 'rxjs';
import Swal from 'sweetalert2';
import { SharedService } from '../../../shared/services/shared.service';
import { AppointmentService } from '../../../appointment/appointment.service';
import { GoogleCalendarComponent } from './googleCalendar.component';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [FullCalendarModule, CommonModule, ModalCalendarComponent, GoogleCalendarComponent],
  templateUrl: './calendar.component.html',
  styleUrl: './calendar.component.scss',
})

export class CalendarComponent {
  constructor(private appointmentsService: AppointmentService, 
    private sharedService: SharedService,
    private http: HttpClient
  ) { }

  @Input() appointments: any[] = [];
  dateModal: Modal | null = null;

  specificDateInfo = {
    title: '',
    startTime: '',
    endTime: '',
    price: 0,
    userName: '',
    dateDay: '',
    appointmentId: ''
  }

  calendarOptions: CalendarOptions = {
    plugins: [
      dayGridPlugin,
      timeGridPlugin,
      interactionPlugin,
      listPlugin
    ],
    eventDidMount: (info) => {
      info.el.style.cursor = 'pointer';
    },
    locale: 'es',
    initialView: 'dayGridMonth',
    firstDay: 1,
    selectMirror: true,
    slotMinTime: '00:00:00',
    slotMaxTime: '24:00:00',
    slotDuration: '00:30:00',
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek'
    },
    events: [],
    dayMaxEvents: 4,
    moreLinkClick: 'popover',
    eventClick: this.handleEventClick.bind(this),
  };

  ngOnChanges(): void {
    this.calendarOptions.events = this.appointments.map(app => ({
      id: app.id,
      title: app.service?.title || 'Cita',
      start: `${app.date}T${app.startTime}`,
      end: `${app.date}T${app.endTime}`,
      backgroundColor: '#0ea5e9',
      textColor: '#fff',
      extendedProps: {
        user: app.user?.name,
        price: app.service?.price,
        appointmentId: app?.id,
        googleEventId: app.googleEventId || null
      }
    }));
  }

  handleEventClick(info: EventClickArg) {
    const popover = document.querySelector('.fc-popover');
    if (popover) {
      popover.remove();
    }

    const { title, start, end, extendedProps } = info.event;
    this.specificDateInfo = {
      title: title,
      startTime: start
        ? start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : '',
      endTime: end
        ? end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : '',
      dateDay: start?.toLocaleDateString() || '',
      price: extendedProps['price'],
      userName: extendedProps['user'],
      appointmentId: extendedProps['appointmentId']
    }

    const modalEl = document.getElementById('readDateModal');
    if (modalEl) {
      if (!this.dateModal) {
        this.dateModal = new Modal(modalEl);
      }
      this.dateModal.show();
    }
  }

  handleCloseModal() {
    this.dateModal?.hide();
  }

  async handleDeleteAppointment(appointmentId: string) {
    Swal.fire({
      title: "¿Estas seguro de borrar esta cita?",
      showDenyButton: true,
      confirmButtonText: "Si",
      confirmButtonColor: "#22c55e",
      denyButtonColor: "#d33",
      denyButtonText: "No",
    }).then(async (result) => {
      if (result.isConfirmed) {
        Swal.fire("Cita eliminada", "", "success");
        await firstValueFrom(this.appointmentsService.deleteAppointment(appointmentId));
        await this.sharedService.loadAllAppointments();
        this.handleCloseModal()

      } else if (result.isDenied) {
        Swal.fire("Cita no eliminada", "", "info");
      }
    });
  }

  formatDateForGoogle(dateStr: string): string {
    const [day, month, year] = dateStr.split('/');
    return `${year}-${month}-${day}`;
  }

  toISO(dateStr: string, time: string): string {
    let year: string, month: string, day: string;
    if (dateStr.includes('/')) {
      [day, month, year] = dateStr.split('/');
    } else if (dateStr.includes('-')) {
      [year, month, day] = dateStr.split('-');
    } else {
      throw new Error(`Formato de fecha no reconocido: ${dateStr}`);
    }
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${time}:00`;
  }

  async syncAppointmentsWithGoogle(accessToken: string) {
    const headers = {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    };

    for (const app of this.appointments) {
      if (app.googleEventId) {
        console.log(`Ya existe en Google Calendar: ${app.id} -> ${app.googleEventId}`);
        continue; // ya sincronizada
      }

      const startDateTime = this.toISO(app.date, app.startTime);
      const endDateTime = this.toISO(app.date, app.endTime);

      const event = {
        summary: app.service?.title || 'Cita',
        description: `Cliente: ${app.user?.name || ''}`,
        start: {
          dateTime: startDateTime,
          timeZone: 'Europe/Madrid',
        },
        end: {
          dateTime: endDateTime,
          timeZone: 'Europe/Madrid',
        },
      };

      const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events`, {
        method: 'POST',
        headers,
        body: JSON.stringify(event),
      });

      const data = await res.json();
      console.log('Evento creado en Google Calendar:', data);

      if (data.id) {
        // actualizar en backend el googleEventId
        await firstValueFrom(
          this.appointmentsService.updateGoogleEventId(app.id, data.id)
        );

        // opcional: actualizar localmente para evitar otro fetch
        app.googleEventId = data.id;
      }
    }
  }

ngOnInit() {
  this.appointmentsService.syncFromGoogle().subscribe({
    next: () => {
      console.log('Sincronización completa');
      // aquí puedes recargar las citas
      this.loadAppointments();
    },
    error: (err) => {
      console.error('Error al sincronizar:', err);
    }
  });
}

loadAppointments() {
  // tu lógica para recargar citas desde la base de datos
  // por ejemplo:
  this.sharedService.loadAllAppointments();
}


}
