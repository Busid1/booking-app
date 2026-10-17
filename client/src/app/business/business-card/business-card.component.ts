import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../auth/auth.service';
import { ServicesService } from '../../dashboard/admin/crud/services.service';
import { SharedService } from '../../shared/services/shared.service';
import { BusinessHoursComponent } from '../business-hours/business-hours.component';
import { ModalComponent } from '../../shared/services/modal.component';
import { BusinessInfoInterface } from '../../shared/interfaces/business-info.interface';
import { DAY_NAMES, mondayBasedDay } from '../../shared/services/time.utils';
import { alerts } from '../../shared/services/alerts';
import { activeSocials, SOCIAL_NETWORKS } from '../../shared/services/social-links';
import { applyBrandColor, isValidHex } from '../../shared/services/theme';

const BRAND_PRESETS = ['#4f46e5', '#0f766e', '#be123c', '#c2410c', '#7c3aed', '#0369a1', '#a16207', '#0f172a'];

type InfoForm = Omit<BusinessInfoInterface, 'images' | 'logo'>;
type Tab = 'datos' | 'redes' | 'marca' | 'reservas';

/** Tarjetas de contacto y horario del negocio, con edición para el administrador. */
@Component({
  selector: 'app-business-card',
  standalone: true,
  imports: [FormsModule, BusinessHoursComponent, ModalComponent],
  templateUrl: './business-card.component.html',
})
export default class BusinessCardComponent {
  readonly auth = inject(AuthService);
  readonly store = inject(SharedService);
  private api = inject(ServicesService);

  readonly info = this.store.businessInfo;
  readonly schedule = this.store.weekSchedule;
  readonly today = mondayBasedDay(new Date());
  readonly dayNames = DAY_NAMES;

  readonly mapsUrl = computed(() =>
    this.info().address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(this.info().address)}` : '',
  );
  readonly telUrl = computed(() => `tel:${this.info().phone.replace(/[^\d+]/g, '')}`);
  readonly socials = computed(() => activeSocials(this.info()));

  /** Datos de contacto a mostrar: el público solo recibe los visibles; el admin los ve todos. */
  readonly contactItems = computed(() => {
    const info = this.info();
    const admin = this.auth.isAdmin();
    const items = [
      { key: 'address', label: 'Dirección', value: info.address, visible: info.showAddress !== false, icon: 'fa-location-dot', tone: 'bg-brand-50 text-brand-600', href: this.mapsUrl() },
      { key: 'phone', label: 'Teléfono', value: info.phone, visible: info.showPhone !== false, icon: 'fa-phone', tone: 'bg-accent-50 text-accent-600', href: info.phone ? this.telUrl() : '' },
      { key: 'email', label: 'Email', value: info.email, visible: info.showEmail !== false, icon: 'fa-envelope', tone: 'bg-amber-50 text-amber-600', href: info.email ? 'mailto:' + info.email : '' },
    ];
    return items.filter(i => (admin ? true : i.visible && !!i.value));
  });
  readonly networks = SOCIAL_NETWORKS;
  readonly brandPresets = BRAND_PRESETS;

  // Edición de información
  readonly isEditOpen = signal(false);
  readonly isSaving = signal(false);
  readonly isHoursOpen = signal(false);
  readonly isUploadingLogo = signal(false);
  readonly tab = signal<Tab>('datos');
  readonly tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'datos', label: 'Datos', icon: 'fa-store' },
    { id: 'redes', label: 'Redes sociales', icon: 'fa-hashtag' },
    { id: 'marca', label: 'Marca', icon: 'fa-palette' },
    { id: 'reservas', label: 'Reservas', icon: 'fa-calendar-check' },
  ];
  form: InfoForm = { name: '', description: '', address: '', phone: '', email: '' };
  private originalColor: string | null | undefined;

  openEdit() {
    const { images, logo, ...rest } = this.info();
    this.form = {
      ...rest,
      primaryColor: rest.primaryColor || '#4f46e5',
      cancellationHours: rest.cancellationHours ?? 0,
      showAddress: rest.showAddress ?? true,
      showPhone: rest.showPhone ?? true,
      showEmail: rest.showEmail ?? true,
      googleCalendarId: rest.googleCalendarId ?? '',
      ...Object.fromEntries(SOCIAL_NETWORKS.map(n => [n.key, rest[n.key] ?? ''])),
    };
    this.originalColor = rest.primaryColor;
    this.tab.set('datos');
    this.isEditOpen.set(true);
    this.store.loadConfig().catch(() => undefined);
  }

  closeEdit() {
    applyBrandColor(this.originalColor); // deshace la vista previa del color
    this.isEditOpen.set(false);
  }

  previewColor(color: string) {
    this.form.primaryColor = color;
    if (isValidHex(color)) applyBrandColor(color);
  }

  async uploadLogo(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/') || file.size > 5 * 1024 * 1024) {
      alerts.warning('Selecciona una imagen de menos de 5 MB');
      return;
    }
    this.isUploadingLogo.set(true);
    try {
      await firstValueFrom(this.api.uploadLogo(file));
      await this.store.loadBusinessInfo();
      applyBrandColor(this.form.primaryColor);
      alerts.success('Logo actualizado');
    } catch (error) {
      alerts.error(error, 'No se ha podido subir el logo');
    } finally {
      this.isUploadingLogo.set(false);
    }
  }

  async removeLogo() {
    try {
      await firstValueFrom(this.api.removeLogo());
      await this.store.loadBusinessInfo();
      applyBrandColor(this.form.primaryColor);
    } catch (error) {
      alerts.error(error, 'No se ha podido quitar el logo');
    }
  }

  async saveInfo() {
    if (!this.form.name.trim()) {
      alerts.warning('El nombre del negocio es obligatorio');
      return;
    }
    this.isSaving.set(true);
    try {
      await firstValueFrom(this.api.saveBusinessInfo({
        ...this.form,
        primaryColor: isValidHex(this.form.primaryColor) ? this.form.primaryColor : '',
        cancellationHours: Number(this.form.cancellationHours) || 0,
      }));
      await this.store.loadBusinessInfo();
      this.originalColor = this.store.businessInfo().primaryColor;
      alerts.success('Información actualizada');
      this.isEditOpen.set(false);
    } catch (error) {
      alerts.error(error, 'No se ha podido guardar la información');
    } finally {
      this.isSaving.set(false);
    }
  }
}
