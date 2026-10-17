import { Component, computed, EventEmitter, inject, Input, OnChanges, OnDestroy, Output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ServiceInterface } from '../../../../shared/interfaces/service.interface';
import { ModalComponent } from '../../../../shared/services/modal.component';
import { alerts } from '../../../../shared/services/alerts';
import { SharedService } from '../../../../shared/services/shared.service';

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const DURATION_PRESETS = [15, 30, 45, 60, 90, 120];

/** Formulario (modal) de creación/edición de servicios. Es presentacional: emite los datos validados. */
@Component({
  selector: 'app-service-form',
  templateUrl: './service-form.component.html',
  imports: [FormsModule, ModalComponent],
  standalone: true,
})
export class ServiceFormComponent implements OnChanges, OnDestroy {
  @Input() mode: 'create' | 'update' = 'create';
  @Input() open = false;
  @Input() service: ServiceInterface | null = null;
  @Input() isSaving = false;

  @Output() close = new EventEmitter<void>();
  @Output() submitForm = new EventEmitter<ServiceInterface>();

  readonly store = inject(SharedService);
  readonly durationPresets = DURATION_PRESETS;
  readonly categories = computed(() =>
    [...new Set(this.store.services().map(s => s.category?.trim()).filter((c): c is string => !!c))].sort(),
  );
  readonly preview = signal<string | null>(null);
  private objectUrl: string | null = null;

  form: ServiceInterface = this.emptyForm();

  private emptyForm(): ServiceInterface {
    return { title: '', price: 0, duration: 30, description: '', image: null, category: '', deposit: null, staffIds: [] };
  }

  ngOnChanges() {
    if (!this.open) return;
    this.revokePreview();
    this.form = this.service
      ? { ...this.service, image: null, staffIds: [...(this.service.staffIds ?? [])], category: this.service.category ?? '' }
      : this.emptyForm();
    if (!this.store.staffLoaded()) this.store.loadStaff().catch(() => undefined);
    if (!this.store.config()) this.store.loadConfig().catch(() => undefined);
    this.preview.set(typeof this.service?.image === 'string' ? this.service.image : null);
  }

  ngOnDestroy() {
    this.revokePreview();
  }

  private revokePreview() {
    if (this.objectUrl) URL.revokeObjectURL(this.objectUrl);
    this.objectUrl = null;
  }

  handleFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alerts.warning('Selecciona un archivo de imagen');
      return;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      alerts.warning('La imagen no puede superar los 5 MB');
      return;
    }

    this.revokePreview();
    this.objectUrl = URL.createObjectURL(file);
    this.preview.set(this.objectUrl);
    this.form.image = file;
  }

  toggleStaff(id: string) {
    const ids = this.form.staffIds ?? [];
    this.form.staffIds = ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id];
  }

  onSubmit(valid: boolean | null) {
    if (!valid) return;
    if (this.form.deposit && this.form.deposit > this.form.price) {
      alerts.warning('La señal no puede ser mayor que el precio');
      return;
    }
    this.submitForm.emit({ ...this.form, id: this.service?.id });
  }
}
