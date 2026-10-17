import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import BusinessCardComponent from './business-card/business-card.component';
import { CarouselComponent } from './business-card/carousel/carousel.component';
import { AuthService } from '../auth/auth.service';
import { SharedService } from '../shared/services/shared.service';
import { alerts } from '../shared/services/alerts';

const WHATSAPP_POPUP_KEY = 'whatsappPopupDismissed';

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
  readonly showWhatsappPopup = signal(!this.readDismissed());

  async ngOnInit() {
    try {
      await Promise.all([this.store.loadBusinessInfo(), this.store.loadAllBusinessHours()]);
    } catch (error) {
      alerts.error(error, 'No se ha podido cargar la información del negocio');
    } finally {
      this.isLoading.set(false);
    }
  }

  private readDismissed(): boolean {
    try {
      return localStorage.getItem(WHATSAPP_POPUP_KEY) === '1';
    } catch {
      return false;
    }
  }

  closePopup() {
    this.showWhatsappPopup.set(false);
    try {
      localStorage.setItem(WHATSAPP_POPUP_KEY, '1');
    } catch {
      /* almacenamiento no disponible */
    }
  }
}
