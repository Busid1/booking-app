import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CalendarOptions, EventClickArg } from '@fullcalendar/core';
import { FullCalendarModule } from '@fullcalendar/angular';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import { DateClickArg } from '@fullcalendar/interaction';
import { Modal } from 'flowbite';
import { ModalCalendarComponent } from "./modal-calendar/modal-calendar.component";
import { firstValueFrom } from 'rxjs';
import Swal from 'sweetalert2';
import { SharedService } from '../../../shared/services/shared.service';
import { AppointmentService } from '../../../booking/appointment.service';
import { ModalCreateAppointmentComponent } from './modal-create-appointment/modal-create-appointment.component';
import { AuthService } from '../../../auth/auth.service';
import { calculateEndTime } from '../../../shared/services/time.utils';

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [FullCalendarModule, CommonModule, ModalCalendarComponent, ModalCreateAppointmentComponent],
  templateUrl: './calendar.component.html',
  styleUrl: './calendar.component.scss',
})

export class CalendarComponent {
  constructor(private appointmentsService: AppointmentService,
    private sharedService: SharedService, private authService: AuthService
  ) { }

  @Input() appointments: any[] = [];
  dateModal: Modal | null = null;
  modalId: string = 'createAppointmentModal';
  selectedDate: string = '';

  specificDateInfo = {
    title: '',
    startTime: '',
    endTime: '',
    price: 0,
    clientName: '',
    dateDay: '',
    appointmentId: ''
  }

  openModal(id: string) {
    this.modalId = id;

    const modalEl = document.getElementById(this.modalId);
    if (modalEl) {
      this.dateModal = new Modal(modalEl);
      this.dateModal.show();
    }
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
    dayCellDidMount: (info) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const cellDate = info.date;

      if (cellDate < today) {
        info.el.style.cursor = 'not-allowed';
      } else {
        info.el.style.cursor = 'crosshair';
      }
    },
    locale: 'es',
    initialView: 'dayGridMonth',
    firstDay: 1,
    selectMirror: true,
    slotMinTime: '00:00:00',
    slotMaxTime: '24:00:00',
    slotDuration: '00:30:00',
    aspectRatio: window.innerWidth < 640 ? 1 : 1.35,
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek'
    },
    dayHeaderContent: (arg) => {
      const width = window.innerWidth;
      return width < 500
        ? arg.date.toLocaleDateString('es-ES', { weekday: 'narrow' })
        : arg.date.toLocaleDateString('es-ES', { weekday: 'short' });
    },
    events: [],
    dateClick: this.handleCreateAppointment.bind(this),
    dayMaxEvents: 3,
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
        clientName: app.clientName || app.user?.name || "Pepe",
        duration: app.service?.duration || 0,
        price: app.service?.price,
        appointmentId: app?.id,
        googleEventId: app.googleEventId || null
      }
    }));    
  }

  handleCreateAppointment(arg: DateClickArg) {
    this.openModal('createAppointmentModal');
    this.selectedDate = arg.date.toLocaleDateString('sv-SE');
  }

  isAdmin() {
    return this.authService.isAdmin();
  }

  handleEventClick(info: EventClickArg) {
    const popover = document.querySelector('.fc-popover');
    this.selectedDate = info.event.start ? info.event.start.toLocaleDateString('sv-SE') : '';

    if (popover) {
      popover.remove();
    }

    const { title, start, end, extendedProps } = info.event;
    
    if (start) {
      this.specificDateInfo = {
        title: title,
        startTime: start
          ? start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : '',
        endTime: end
          ? end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : calculateEndTime(start, extendedProps['duration']),
        dateDay: this.selectedDate || '',
        price: extendedProps['price'],
        clientName: extendedProps['clientName'],
        appointmentId: extendedProps['appointmentId']
      }
    }

    this.openModal("readUpdateAppointmentModal")
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

  ngOnInit() {
    this.appointmentsService.syncFromGoogle().subscribe({
      next: () => {
        this.loadAppointments();
      },
      error: (err) => {
        console.error('Error al sincronizar:', err);
      }
    });
  }

  loadAppointments() {
    this.sharedService.loadAllAppointments();
  }

}
