import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, Output, EventEmitter, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { ServicesService } from '../../crud/services.service';
import Swal from 'sweetalert2';
import { AppointmentService } from '../../../../booking/appointment.service';
import { SharedService } from '../../../../shared/services/shared.service';

@Component({
  selector: 'app-modal-calendar',
  templateUrl: './modal-calendar.component.html',
  standalone: true,
  imports: [CurrencyPipe, CommonModule, FormsModule]
})

export class ModalCalendarComponent {
  constructor(private appointmentsService: AppointmentService, private servicesService: ServicesService, private sharedService: SharedService) { }
  services: any = []
  @Input() date: string = '';
  @Output() closeModal = new EventEmitter<void>();
  @Output() deleteAppointment = new EventEmitter<string>();
  @Input() specificDate: {
    title: string;
    startTime: string;
    endTime: string;
    price: number;
    clientName: string;
    dateDay: string;
    appointmentId: string;
  } = {
      title: '',
      startTime: '',
      endTime: '',
      price: 0,
      clientName: '',
      dateDay: '',
      appointmentId: ''
    };
  appointmentData: any = {
    service: '',
    serviceId: '',
    date: '',
    startTime: '',
    endTime: '',
    clientName: ''
  };

  selectedService: any = null;

  onServiceChange() {
    this.selectedService = this.services.find(
      (s: any) => s.id === this.appointmentData.service
    );
    this.appointmentData.serviceId = this.selectedService.id

    this.updateEndTime();
  }

  onStartTimeChange() {
    this.updateEndTime();
  }

  updateEndTime() {
    if (!this.appointmentData.startTime || !this.selectedService?.duration) {
      return;
    }

    const [hours, minutes] = this.appointmentData.startTime.split(':').map(Number);
    const startDate = new Date();
    startDate.setHours(hours, minutes);

    const endDate = new Date(startDate.getTime() + this.selectedService.duration * 60000);

    const endHours = String(endDate.getHours()).padStart(2, '0');
    const endMinutes = String(endDate.getMinutes()).padStart(2, '0');

    this.appointmentData.endTime = `${endHours}:${endMinutes}`;
  }

  handleInputChange(field: keyof typeof this.appointmentData, event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.appointmentData[field] = value;
  }

  isEditMode = false;

  onEditAppointment() {
    this.isEditMode = !this.isEditMode;
    this.appointmentData.startTime = this.specificDate.startTime
    this.appointmentData.endTime = this.specificDate.endTime
  }

  async handleSubmit(event: Event) {
    event.preventDefault();
    const token = localStorage.getItem("authToken") || "";
    if (!this.appointmentData.serviceId) {
      Swal.fire({
        title: "Por favor, selecciona un servicio",
        icon: "error",
      });
      return;
    }
    if (!this.appointmentData.serviceId) {
      Swal.fire({
        title: "Por favor, selecciona un servicio",
        icon: "error",
      });
      return;
    } 
    else {
      try {
        await firstValueFrom(this.appointmentsService.updateAppointment(this.appointmentData, token, this.specificDate.appointmentId))
        Swal.fire({
          title: 'Cita actualizada correctamente',
          icon: 'success',
          confirmButtonText: 'Ok',
          confirmButtonColor: '#22c55e',
        });
        this.sharedService.loadAllAppointments();
        this.onEditAppointment();
        this.onClose();
      } catch (error) {
        console.log(error)
      }
    }
  }

  onClose() {
    this.closeModal.emit();
  }

  onDeleteAppointment() {
    if (this.specificDate?.appointmentId) {
      this.deleteAppointment.emit(this.specificDate.appointmentId);
    }
  }

  async ngOnChanges() {
    this.services = await firstValueFrom(this.servicesService.getServices());
    if (this.date) {
      this.appointmentData.date = this.date;
    }
    this.appointmentData.clientName = this.specificDate.clientName
  }
}
