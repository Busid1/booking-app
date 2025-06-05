import { Component, AfterViewInit } from '@angular/core';
import { FullCalendarModule } from '@fullcalendar/angular';
import { CalendarOptions, EventInput } from '@fullcalendar/core';
import interactionPlugin from '@fullcalendar/interaction';
import dayGridPlugin from '@fullcalendar/daygrid';
import { CommonModule } from '@angular/common';
import { Modal } from 'flowbite';

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [FullCalendarModule, CommonModule],
  templateUrl: './calendar.component.html',
  styleUrl: './calendar.component.scss'
})
export default class CalendarComponent implements AfterViewInit {
  private modal: Modal | null = null;

  calendarOptions: CalendarOptions = {
    plugins: [dayGridPlugin, interactionPlugin],
    initialView: 'dayGridMonth',
    dateClick: (arg) => this.handleDateClick(arg)
  };

  eventsPromise: Promise<EventInput[]> = Promise.resolve([]);

  ngAfterViewInit(): void {
    const modalElement = document.querySelector('#default-modal');
    if (modalElement) {
      this.modal = new Modal(modalElement as HTMLElement, {
        placement: 'center',
        backdrop: 'dynamic',
        backdropClasses: 'bg-gray-900/50 dark:bg-gray-900/80 fixed inset-0 z-40',
        onHide: () => console.log('modal is hidden'),
        onShow: () => console.log('modal is shown'),
        onToggle: () => console.log('modal has been toggled'),
      });
    } else {
      console.error('Elemento del modal no encontrado en el DOM');
    }
  }

  handleDateClick(arg: any) {
    console.log(arg.dateStr);
    if (this.modal) {
      this.modal.show();
    } else {
      console.error('Modal no inicializado.');
    }
  }
}
