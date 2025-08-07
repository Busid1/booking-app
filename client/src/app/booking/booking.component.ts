import { Component } from '@angular/core';
import { DatePickerComponent } from './datePicker/datePicker.component';
import { AppointmentService } from './appointment.service';
import { CommonModule } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { AppointmentInterface } from '../shared/interfaces/appointment.interface';
import { ServiceInterface } from '../shared/interfaces/service.interface';
import { toMinutes, toTimeString } from '../shared/services/time.utils';
import { ServicesService } from '../dashboard/admin/crud/services.service';
import { SharedService } from '../shared/services/shared.service';
import { BusinessHoursInterface } from '../shared/interfaces/business-hours.interface';
import Swal from 'sweetalert2';
import { Modal } from 'flowbite';

@Component({
  selector: 'app-booking',
  templateUrl: './booking.component.html',
  standalone: true,
  imports: [DatePickerComponent, CommonModule]
})

export class BookingComponent {
  constructor(private appointmentService: AppointmentService, private servicesService: ServicesService, private sharedService: SharedService) { }
  currentStep = 1;
  selectedServiceId: string = ""
  private modal: Modal | null = null;

  appointmentData: AppointmentInterface = {
    date: '',
    startTime: '',
    endTime: '',
    serviceId: '',
    clientName: ''
  };

  selectedServiceData: ServiceInterface = {
    title: '', price: 0, duration: 0, description: '', image: ''
  };

  appointmentsAvailable: string[] = [];
  dateAppointment: string | null = null;
  dateHourAppointment: string | null = null;

  nextStep() {
    if (this.currentStep === 1) {
      if (!this.appointmentData.date) return this.showWarning('Por favor, selecciona una fecha');
      if (!this.appointmentsAvailable.length) return this.showWarning('No hay horas disponibles para la fecha seleccionada');
      if (!this.appointmentData.startTime) return this.showWarning('Por favor, selecciona una hora');
    }

    if (this.currentStep < 2) this.currentStep++;
  }

  showWarning(message: string) {
    Swal.fire({
      title: message,
      icon: 'warning',
      confirmButtonText: 'Ok',
      confirmButtonColor: '#22c55e'
    });
  }

  prevStep() {
    this.currentStep = 1
  }

  isLoading = false;

  async handleReserveAppointment(event: Event) {
    event.preventDefault();
    const token = localStorage.getItem("authToken") || "";

    if (!token) {
      Swal.fire({
        icon: 'warning',
        title: 'No autorizado',
        text: 'Debes iniciar sesión para reservar una cita',
        confirmButtonText: 'Ok',
        confirmButtonColor: '#f87171',
      });
      return;
    }

    this.isLoading = true;

    try {
      await firstValueFrom(this.appointmentService.createAppointment(this.appointmentData, token));
      Swal.fire({
        title: "Cita reservada correctamente",
        confirmButtonText: "Ok",
        confirmButtonColor: "#22c55e",
      })
      this.hideModal();
      this.currentStep = 1;
      this.appointmentData = {
        date: '',
        startTime: '',
        endTime: '',
        serviceId: '',
        clientName: ''
      };
    } catch (error) {
      console.log(error)
    } finally {
      this.isLoading = false;
    }
  }

  async onDateSelected(dateStr: string) {
    this.dateAppointment = dateStr;
    this.appointmentData.date = dateStr;
    await this.loadAvailableSlots();
  }

  onHourSelected(hour: string) {
    this.dateHourAppointment = hour;
    const end = toTimeString(toMinutes(hour) + this.selectedServiceData.duration);
    this.appointmentData.startTime = hour;
    this.appointmentData.endTime = end;
  }

  generateTimeSlots(businessHours: BusinessHoursInterface, serviceDurationMinutes: number): string[] {
    if (businessHours.isClosed) return [];

    const slots: string[] = [];

    for (const block of businessHours.timeBlocks) {
      const start = toMinutes(block.openTime);
      const end = toMinutes(block.closeTime);

      for (let time = start; time + serviceDurationMinutes <= end; time += serviceDurationMinutes) {
        slots.push(toTimeString(time));
      }
    }

    return slots;
  }

  async loadAvailableSlots() {
    const [hours, services, reservedAppointments] = await Promise.all([
      firstValueFrom(this.servicesService.getBusinessHours()),
      firstValueFrom(this.servicesService.getServices()),
      firstValueFrom(this.appointmentService.getAppointments())
    ]);

    const selectedService = services.find(s => s.id === this.appointmentData.serviceId);
    if (!selectedService) return;
    this.selectedServiceData = selectedService;

    const dayIndex = new Date(this.dateAppointment!).getDay();
    const adjustedIndex = dayIndex === 0 ? 6 : dayIndex - 1;

    const dayHours = hours.find(h => h.dayOfWeek === adjustedIndex);
    if (!dayHours) return;

    if (dayHours.isClosed) {
      this.appointmentsAvailable = [];
      return;
    }

    const filterAppointments = reservedAppointments.filter(
      a => a.date === this.appointmentData.date && a.serviceId === this.appointmentData.serviceId
    );

    const allSlots = this.generateTimeSlots(dayHours, selectedService.duration);

    const reservedStartTimes = filterAppointments.map(a => toTimeString(toMinutes(a.startTime)));

    const now = new Date();
    const isToday =
      this.appointmentData.date === now.toISOString().split('T')[0];

    const availableSlots = allSlots.filter(slot => {
      const normalizedSlot = toTimeString(toMinutes(slot));
      const isReserved = reservedStartTimes.includes(normalizedSlot);

      if (isReserved) return false;

      if (isToday) {
        const [slotH, slotM] = slot.split(':').map(Number);
        const slotMinutes = slotH * 60 + slotM;
        const nowMinutes = now.getHours() * 60 + now.getMinutes();

        if (slotMinutes <= nowMinutes) {
          return false;
        }
      }

      return true;
    });

    this.appointmentsAvailable = availableSlots;
  }

  async ngOnInit() {
    this.sharedService.selectedService$.subscribe(async id => {
      if (!id) return;

      this.selectedServiceId = id;
      this.appointmentData.serviceId = id;

      const today = new Date().toLocaleDateString("en-CA");

      this.dateAppointment = today;
      this.appointmentData.date = today;

      await this.loadAvailableSlots();

      if (!this.appointmentsAvailable.length) {
        this.dateAppointment = null;
        this.appointmentData.date = '';
      }
    });
  }

  ngAfterViewInit() {
    const modalEl = document.getElementById('bookAppointmentModal');
    if (modalEl) {
      this.modal = new Modal(modalEl);
    } else {
      console.error('bookAppointmentModal no encontrado');
    }
  }

  showModal() {
    this.modal?.show();
  }

  hideModal() {
    this.modal?.hide();
  }

} 
