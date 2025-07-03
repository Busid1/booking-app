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

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [FullCalendarModule, CommonModule, ModalCalendarComponent],
  template: `<div>
    <full-calendar [options]="calendarOptions"></full-calendar>
    <app-modal-calendar (closeModal)="handleCloseModal()" (deleteAppointment)="handleDeleteAppointment($event)" [specificDate]="specificDateInfo"></app-modal-calendar>
  </div>`,
  styleUrl: './calendar.component.scss',
})

export class CalendarComponent {
  constructor(private appointmentsService: AppointmentService, private sharedService: SharedService) { }

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
        appointmentId: app?.id
      }
    }));
  }

  handleEventClick(info: EventClickArg) {
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
}
