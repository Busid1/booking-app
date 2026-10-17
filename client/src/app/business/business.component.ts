import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import BusinessCardComponent from './business-card/business-card.component';
import { CarouselComponent } from './business-card/carousel/carousel.component';
import { AuthService } from '../auth/auth.service';
import { SharedService } from '../shared/services/shared.service';
import { alerts } from '../shared/services/alerts';

/** Portada del negocio: hero con carrusel, contacto y horario. */
@Component({
  selector: 'app-business',
  standalone: true,
  imports: [BusinessCardComponent, CarouselComponent, RouterLink],
  templateUrl: './business.component.html',
})
export class BusinessComponent implements OnInit {
  readonly auth = inject(AuthService);
  readonly store = inject(SharedService);

  readonly isLoading = signal(!this.store.infoLoaded());

  async ngOnInit() {
    try {
      await Promise.all([this.store.loadBusinessInfo(), this.store.loadAllBusinessHours()]);
    } catch (error) {
      alerts.error(error, 'No se ha podido cargar la información del negocio');
    } finally {
      this.isLoading.set(false);
    }
  }
}
