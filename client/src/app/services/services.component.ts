import { Component, computed, inject, Input, OnInit, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ServicesService } from '../dashboard/admin/crud/services.service';
import { UpdateServiceComponent } from '../dashboard/admin/crud/update-service/update-service.component';
import { AdminButtonsComponent } from '../dashboard/admin/admin-buttons/admin-buttons.component';
import { BookingComponent } from '../booking/booking.component';
import { AuthService } from '../auth/auth.service';
import { SharedService } from '../shared/services/shared.service';
import { ServiceInterface } from '../shared/interfaces/service.interface';
import { formatDuration } from '../shared/services/time.utils';
import { alerts } from '../shared/services/alerts';

type SortOption = 'default' | 'price-asc' | 'price-desc' | 'duration';

@Component({
  selector: 'app-services',
  templateUrl: './services.component.html',
  standalone: true,
  imports: [CurrencyPipe, FormsModule, UpdateServiceComponent, BookingComponent, AdminButtonsComponent],
})
export class ServicesComponent implements OnInit {
  private api = inject(ServicesService);
  private router = inject(Router);
  readonly auth = inject(AuthService);
  readonly store = inject(SharedService);

  /** `?reservar=<id>` abre directamente la reserva de ese servicio. */
  @Input() reservar = '';

  readonly isLoading = signal(!this.store.servicesLoaded());
  readonly loadError = signal(false);
  readonly search = signal('');
  readonly sort = signal<SortOption>('default');
  readonly deletingId = signal<string | null>(null);
  readonly formatDuration = formatDuration;

  readonly bookingService = signal<ServiceInterface | null>(null);
  readonly editingService = signal<ServiceInterface | null>(null);

  readonly filteredServices = computed(() => {
    const term = this.search().trim().toLowerCase();
    const list = this.store.services().filter(s =>
      !term || s.title.toLowerCase().includes(term) || s.description?.toLowerCase().includes(term),
    );
    switch (this.sort()) {
      case 'price-asc': return [...list].sort((a, b) => a.price - b.price);
      case 'price-desc': return [...list].sort((a, b) => b.price - a.price);
      case 'duration': return [...list].sort((a, b) => a.duration - b.duration);
      default: return list;
    }
  });

  async ngOnInit() {
    await this.load();
    // Precarga el horario para que el asistente de reserva abra al instante.
    this.store.loadAllBusinessHours().catch(() => undefined);

    if (this.reservar) {
      const service = this.store.services().find(s => s.id === this.reservar);
      this.router.navigate([], { queryParams: { reservar: null }, replaceUrl: true });
      if (service) this.book(service);
    }
  }

  async load() {
    this.loadError.set(false);
    try {
      await this.store.loadAllServices();
    } catch {
      this.loadError.set(true);
    } finally {
      this.isLoading.set(false);
    }
  }

  async book(service: ServiceInterface) {
    if (!this.auth.isLoggedIn()) {
      const goLogin = await alerts.confirm({
        title: 'Inicia sesión para reservar',
        text: 'Necesitas una cuenta para poder gestionar tus citas. ¡Solo te llevará unos segundos!',
        confirmText: 'Iniciar sesión',
        cancelText: 'Ahora no',
      });
      if (goLogin) {
        this.router.navigate(['/auth/login'], { queryParams: { returnUrl: `/servicios?reservar=${service.id}` } });
      }
      return;
    }
    this.bookingService.set(service);
  }

  async handleDeleteService(service: ServiceInterface) {
    if (!service.id) return;

    const confirmed = await alerts.confirm({
      title: `¿Eliminar «${service.title}»?`,
      text: 'Todas las citas asociadas a este servicio también se eliminarán.',
      confirmText: 'Sí, eliminar',
      danger: true,
    });
    if (!confirmed) return;

    this.deletingId.set(service.id);
    try {
      await firstValueFrom(this.api.deleteService(service.id));
      await this.store.loadAllServices();
      alerts.success('Servicio eliminado');
    } catch (error) {
      alerts.error(error, 'No se ha podido eliminar el servicio');
    } finally {
      this.deletingId.set(null);
    }
  }
}
