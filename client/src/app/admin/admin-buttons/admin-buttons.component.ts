import { AfterViewInit, Component } from '@angular/core';
import { UpdateServiceComponent } from '../crud/update-service/update-service.component';
import { Modal } from 'flowbite';
import { CreateServiceComponent } from '../crud/create-service/create-service.component';

@Component({
  selector: 'app-admin-buttons',
  standalone: true,
  imports: [UpdateServiceComponent, CreateServiceComponent],
  templateUrl: './admin-buttons.component.html',
  styleUrl: './admin-buttons.component.scss'
})
export class AdminButtonsComponent implements AfterViewInit {
  private modal: Modal | null = null;

  ngAfterViewInit(): void {
    const updateServiceModalElement = document.querySelector('#updateServiceModal');
    const createServiceModalElement = document.querySelector('#createServiceModal');

    if (createServiceModalElement) {
      this.modal = new Modal(createServiceModalElement as HTMLElement, {
        placement: 'center',
        backdrop: 'dynamic',
        backdropClasses: 'bg-gray-900/50 dark:bg-gray-900/80 fixed inset-0 z-40',
      });
      // const closeButton = updateServiceModalElement || createServiceModalElement?.querySelector('[data-modal-toggle]');
      // if (closeButton && this.modal) {
      //   closeButton.addEventListener('click', () => {
      //     this.modal?.hide();
      //   });
      // }
    } else {
      console.error('Modal element not found in the DOM');
    }
  }

  handleActiveModal() {
    if (this.modal) {
      this.modal.show();
    } else {
      console.error('Modal not initialized.');
    }
  }
}
