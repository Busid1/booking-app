import { AfterViewInit, Component } from '@angular/core';
import { ServicesService } from '../dashboard/admin/crud/services.service';
import { firstValueFrom } from 'rxjs';
import { CurrencyPipe } from '@angular/common';
import { ServiceInterface } from '../shared/interfaces/service.interface';
import { Modal } from 'flowbite';
import { UpdateServiceComponent } from '../dashboard/admin/crud/update-service/update-service.component';
import Swal from 'sweetalert2';
import { AuthService } from '../auth/auth.service';
import { AppointmentComponent } from '../appointment/appointment.component';
import { SharedService } from '../shared/services/shared.service';

@Component({
  selector: 'app-services',
  templateUrl: './services.component.html',
  standalone: true,
  imports: [CurrencyPipe, UpdateServiceComponent, AppointmentComponent],
})

export class ServicesComponent implements AfterViewInit {
  constructor(private servicesService: ServicesService, private authService: AuthService, private sharedService: SharedService) { }

  private modal: Modal | null = null;
  allServices: ServiceInterface[] = [];
  serviceFormData: ServiceInterface | null = null;
  serviceId: string = "";
  isLoadingModal: boolean = false;

  isAdmin() {
    return this.authService.isAdmin();
  }

  ngAfterViewInit(): void {
    const updateServiceModalElement = document.getElementById('updateServiceModal');
    const datepickerModal = document.getElementById('datepickerModal');

    if (updateServiceModalElement && this.isAdmin()) {
      this.modal = new Modal(updateServiceModalElement)
    } else if (datepickerModal) {
      this.modal = new Modal(datepickerModal)
    }
    else {
      console.error('Modal element not found in the DOM');
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
        console.error('Modal not initialized.');
      }
    } catch (error) {
      console.error('Error loading modal data', error);
    } finally {
      this.isLoadingModal = false;
    }
  }

  async handleDeleteService(id: string) {
    if (id) {
      Swal.fire({
        title: "¿Estas seguro de borrar este servicio?",
        showDenyButton: true,
        confirmButtonText: "Si",
        confirmButtonColor: "#22c55e",
        denyButtonColor: "#d33",
        denyButtonText: "No",
      }).then(async (result) => {
        if (result.isConfirmed) {
          Swal.fire("Servicio eliminado", "", "success");
          await firstValueFrom(this.servicesService.deleteService(id));
          this.allServices = this.allServices.filter(service => service.id !== id);
        } else if (result.isDenied) {
          Swal.fire("Servicio no eliminado", "", "info");
        }
      });
    }
  }

  async ngOnInit() {
    await this.sharedService.loadAllServices();
    this.sharedService.allServices$.subscribe(data => {
      this.allServices = data;
    });
  }

  handleCloseModal() {
    this.modal?.hide();
  }
}
