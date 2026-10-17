import { Component, computed, inject, Input, OnChanges, OnInit, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ServicesService } from '../dashboard/admin/crud/services.service';
import { UpdateServiceComponent } from '../dashboard/admin/crud/update-service/update-service.component';
import { AdminButtonsComponent } from '../dashboard/admin/admin-buttons/admin-buttons.component';
import { BookingComponent } from '../booking/booking.component';
import { AuthService } from '../auth/auth.service';
import { SharedService } from '../shared/services/shared.service';
import { StaffAvatarComponent } from '../shared/services/staff-avatar.component';
import { StarRatingComponent } from '../shared/services/star-rating.component';
import { ServiceInterface } from '../shared/interfaces/service.interface';
import { formatDuration } from '../shared/services/time.utils';
import { alerts } from '../shared/services/alerts';

type SortOption = 'default' | 'price-asc' | 'price-desc' | 'duration';

const UNCATEGORIZED = 'Otros servicios';

@Component({
  selector: 'app-services',
  templateUrl: './services.component.html',
  standalone: true,
  imports: [
    CurrencyPipe, FormsModule, RouterLink, UpdateServiceComponent, BookingComponent, AdminButtonsComponent,
    StaffAvatarComponent, StarRatingComponent,
  ],
})
export class ServicesComponent implements OnInit, OnChanges {
  private api = inject(ServicesService);
  private router = inject(Router);
  readonly auth = inject(AuthService);
  readonly store = inject(SharedService);

  /** `?reservar=<id>` abre directamente la reserva de ese servicio. */
  @Input() reservar = '';
  /** `/reservar/:slug` muestra la página de un profesional concreto. */
  @Input() slug = '';

  readonly isLoading = signal(!this.store.servicesLoaded());
  readonly loadError = signal(false);
  readonly search = signal('');
  readonly sort = signal<SortOption>('default');
  readonly category = signal<string | null>(null);
  readonly deletingId = signal<string | null>(null);
  readonly reordering = signal(false);
  readonly formatDuration = formatDuration;

  readonly bookingService = signal<ServiceInterface | null>(null);
  readonly editingService = signal<ServiceInterface | null>(null);
  private readonly slugSignal = signal('');

  /** Profesional de la página /reservar/:slug (si existe). */
  readonly staffMember = computed(() => this.store.staff().find(s => s.slug === this.slugSignal()) ?? null);

  readonly categories = computed(() => {
    const set = new Set(this.visibleServices().map(s => s.category?.trim() || UNCATEGORIZED));
    return [...set].sort((a, b) => (a === UNCATEGORIZED ? 1 : b === UNCATEGORIZED ? -1 : a.localeCompare(b)));
  });

  /** Servicios visibles: en la página de un profesional, solo los que realiza. */
  private readonly visibleServices = computed(() => {
    const member = this.staffMember();
    const all = this.store.services();
    if (!member) return all;
    return all.filter(s => this.store.staffForService(s.id).some(m => m.id === member.id));
  });

  readonly filteredServices = computed(() => {
    const term = this.search().trim().toLowerCase();
    const cat = this.category();
    const list = this.visibleServices().filter(s =>
      (!term || s.title.toLowerCase().includes(term) || s.description?.toLowerCase().includes(term)) &&
      (!cat || (s.category?.trim() || UNCATEGORIZED) === cat),
    );
    switch (this.sort()) {
      case 'price-asc': return [...list].sort((a, b) => a.price - b.price);
      case 'price-desc': return [...list].sort((a, b) => b.price - a.price);
      case 'duration': return [...list].sort((a, b) => a.duration - b.duration);
      default: return list;
    }
  });

  /** Agrupados por categoría (solo si hay más de una y no se está filtrando). */
  readonly groups = computed(() => {
    const list = this.filteredServices();
    if (this.categories().length < 2 || this.category() || this.sort() !== 'default') {
      return [{ name: '', services: list }];
    }
    return this.categories()
      .map(name => ({ name, services: list.filter(s => (s.category?.trim() || UNCATEGORIZED) === name) }))
      .filter(g => g.services.length);
  });

  ngOnChanges() {
    this.slugSignal.set(this.slug ?? '');
  }

  async ngOnInit() {
    this.slugSignal.set(this.slug ?? '');
    await this.load();
    // Precarga lo necesario para que el asistente de reserva abra al instante.
    this.store.loadAllBusinessHours().catch(() => undefined);
    this.store.loadConfig().catch(() => undefined);

    if (this.slug && !this.staffMember()) {
      alerts.warning('No hemos encontrado a ese profesional');
      this.router.navigate(['/servicios'], { replaceUrl: true });
      return;
    }

    if (this.reservar) {
      const service = this.store.services().find(s => s.id === this.reservar);
      this.router.navigate([], { queryParams: { reservar: null }, queryParamsHandling: 'merge', replaceUrl: true });
      if (service) this.book(service);
    }
  }

  async load() {
    this.loadError.set(false);
    try {
      await Promise.all([this.store.loadAllServices(), this.store.loadStaff()]);
    } catch {
      this.loadError.set(true);
    } finally {
      this.isLoading.set(false);
    }
  }

  staffNames(service: ServiceInterface): string {
    const staff = this.store.staffForService(service.id);
    return staff.length === this.store.staff().length ? '' : staff.map(s => s.name.split(' ')[0]).join(', ');
  }

  book(service: ServiceInterface) {
    this.bookingService.set(service);
  }

  copyStaffLink() {
    const url = `${location.origin}/reservar/${this.slug}`;
    navigator.clipboard?.writeText(url).then(() => alerts.success('Enlace copiado')).catch(() => alerts.info(url));
  }

  /** Mueve un servicio una posición (solo administrador). */
  async move(service: ServiceInterface, delta: -1 | 1) {
    const list = [...this.store.services()];
    const index = list.findIndex(s => s.id === service.id);
    const target = index + delta;
    if (index < 0 || target < 0 || target >= list.length) return;
    [list[index], list[target]] = [list[target], list[index]];
    this.store.services.set(list);

    this.reordering.set(true);
    try {
      this.store.services.set(await firstValueFrom(this.api.reorderServices(list.map(s => s.id!))));
    } catch (error) {
      alerts.error(error, 'No se ha podido cambiar el orden');
      await this.store.loadAllServices();
    } finally {
      this.reordering.set(false);
    }
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
