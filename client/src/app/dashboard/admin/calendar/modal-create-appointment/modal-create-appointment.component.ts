import { Component, EventEmitter, Input, Output } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AppointmentService } from '../../../../booking/appointment.service';
import { CommonModule } from '@angular/common';
import { ServicesService } from '../../crud/services.service';
import Swal from 'sweetalert2';
import { SharedService } from '../../../../shared/services/shared.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-modal-create-appointment',
  templateUrl: './modal-create-appointment.component.html',
  imports: [CommonModule, FormsModule],
  standalone: true,
})

export class ModalCreateAppointmentComponent {
  constructor(private appointmentsService: AppointmentService, private servicesService: ServicesService, private sharedService: SharedService) { }
  @Output() closeModal = new EventEmitter<void>();
  @Input() date: string = '';
  services: any = [];

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

  onClose() {
    this.closeModal.emit()
  }

  async handleSubmit(event: Event) {
    event.preventDefault();
    const token = localStorage.getItem("authToken") || "";
    if (!this.appointmentData.service) {
      Swal.fire({
        title: "Por favor, selecciona un servicio",
        icon: "error",
      })
      return
    }

    if (!this.appointmentData.startTime || !this.appointmentData.endTime) {
      Swal.fire({
        title: "Debe de asignar una hora de inicio y fin",
        icon: "error",
      })
      return
    }

    if (this.appointmentData.endTime < this.appointmentData.startTime) {
      Swal.fire({
        title: "La hora de fin es menor al de inicio",
        icon: "error",
      });
      return;
    }

    if (!this.appointmentData.clientName) {
      Swal.fire({
        title: "Debe de asignar un nombre al cliente",
        icon: "error",
      })
      return
    }

    try {
      await firstValueFrom(this.appointmentsService.createAppointment(this.appointmentData, token))
      Swal.fire({
        title: 'Cita reservada correctamente',
        icon: 'success',
        confirmButtonText: 'Ok',
        confirmButtonColor: '#22c55e',
      });
      this.sharedService.loadAllAppointments();
      this.onClose();
    } catch (error) {
      console.log(error)
    }
  }

  async ngOnChanges() {
    this.services = await firstValueFrom(this.servicesService.getServices());
    if (this.date) {
      this.appointmentData.date = this.date;
    }
  }

}
