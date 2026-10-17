import { Component, signal } from '@angular/core';
import { CreateServiceComponent } from '../crud/create-service/create-service.component';

/** Tarjeta "Añadir servicio" del grid de servicios (solo administrador). */
@Component({
  selector: 'app-admin-buttons',
  standalone: true,
  imports: [CreateServiceComponent],
  templateUrl: './admin-buttons.component.html',
})
export class AdminButtonsComponent {
  readonly isOpen = signal(false);
}
