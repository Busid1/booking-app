import { AfterViewInit, Component, ViewChild } from '@angular/core';
import { ServicesService } from '../dashboard/admin/crud/services.service';
import { firstValueFrom } from 'rxjs';
import { CurrencyPipe } from '@angular/common';
import { ServiceInterface } from '../shared/interfaces/service.interface';
import { Modal } from 'flowbite';
import { UpdateServiceComponent } from '../dashboard/admin/crud/update-service/update-service.component';
import Swal from 'sweetalert2';
import { AuthService } from '../auth/auth.service';
import { BookingComponent } from '../booking/booking.component';
import { SharedService } from '../shared/services/shared.service';

@Component({
  selector: 'app-services',
  templateUrl: './services.component.html',
  standalone: true,
  imports: [CurrencyPipe, UpdateServiceComponent, BookingComponent],
})

export class ServicesComponent implements AfterViewInit {
  constructor(private servicesService: ServicesService, private authService: AuthService, private sharedService: SharedService) { }

  private modal: Modal | null = null;
  allServices: ServiceInterface[] = [];
  serviceFormData: ServiceInterface | null = null;
  serviceId: string = "";
  isLoadingModal: boolean = false;
  isLoadingServices: boolean = false;

  isAdmin() {
    return this.authService.isAdmin();
  }

  ngAfterViewInit(): void {
    const updateServiceModalElement = document.getElementById('updateServiceModal');

    if (updateServiceModalElement && this.isAdmin()) {
      this.modal = new Modal(updateServiceModalElement)
    }
  }

  async handleActiveModal(id: string) {
    this.isLoadingModal = true;

    try {
      if (id) {
        const response = await firstValueFrom(this.servicesService.getService(id));
        this.serviceFormData = response;
        this.sharedService.setSelectedService(id);
      }

      if (this.modal) {
        this.modal.show();
      } else {
        this.appointmentComp.showModal()
      }
    } catch (error) {
      console.error('Error loading modal data', error);
    } finally {
      this.isLoadingModal = false;
    }
  }

  async handleDeleteService(id: string) {
    if (!id) return;

    const result = await Swal.fire({
      title: "¿Estás seguro de borrar este servicio?",
      text: "⚠️ Todas las citas asociadas a este servicio también se eliminarán.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "No, cancelar",
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
    });

    if (result.isConfirmed) {
      try {
        await firstValueFrom(this.servicesService.deleteService(id));

        Swal.fire({
          title: "Servicio eliminado",
          text: "El servicio y todas sus citas han sido eliminados correctamente.",
          icon: "success",
          confirmButtonColor: "#22c55e",
        });

        await this.sharedService.loadAllServices();

      } catch (error) {
        console.error('Error al eliminar servicio:', error);
        Swal.fire({
          title: "Error",
          text: "No se pudo eliminar el servicio. Por favor, intenta nuevamente.",
          icon: "error",
        });
      }
    }
  }

  async ngOnInit() {
    this.isLoadingServices = true
    await this.sharedService.loadAllServices();
    this.isLoadingServices = false
    this.sharedService.allServices$.subscribe(data => {
      this.allServices = data;
    });
  }

  @ViewChild(BookingComponent) appointmentComp!: BookingComponent;

  handleCloseModal() {
    if (this.isAdmin()) {
      this.modal?.hide();
    } else {
      this.appointmentComp.hideModal();
    }
  }
}
