import { Component } from '@angular/core';
import { Modal } from 'flowbite';
import { CreateServiceComponent } from '../crud/create-service/create-service.component';

@Component({
  selector: 'app-admin-buttons',
  standalone: true,
  imports: [CreateServiceComponent],
  templateUrl: './admin-buttons.component.html',
  styleUrl: './admin-buttons.component.scss'
})
export class AdminButtonsComponent {
  private modal: Modal | null = null;

  ngAfterViewInit(): void {
    const createServiceModalElement = document.getElementById('createServiceModal');

    if (createServiceModalElement) {
      this.modal = new Modal(createServiceModalElement)
    }
    else {
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

  handleCloseModal() {
    this.modal?.hide();
  }
}
