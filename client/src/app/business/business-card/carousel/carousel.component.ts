import { Component, computed, inject, Input, OnDestroy, OnInit, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ServicesService } from '../../../dashboard/admin/crud/services.service';
import { SharedService } from '../../../shared/services/shared.service';
import { ModalComponent } from '../../../shared/services/modal.component';
import { alerts } from '../../../shared/services/alerts';

const MAX_IMAGES = 3;
const AUTOPLAY_MS = 6000;

/** Carrusel de imágenes del negocio con gestor de imágenes para el administrador. */
@Component({
  selector: 'app-carousel',
  templateUrl: './carousel.component.html',
  imports: [ModalComponent],
  standalone: true,
})
export class CarouselComponent implements OnInit, OnDestroy {
  private api = inject(ServicesService);
  private store = inject(SharedService);

  @Input() isAdmin = false;

  readonly slides = computed(() => this.store.businessInfo().images ?? []);
  readonly currentIndex = signal(0);
  private timer: ReturnType<typeof setInterval> | null = null;

  // Gestor de imágenes
  readonly isModalOpen = signal(false);
  readonly pending = signal<{ file: File; preview: string }[]>([]);
  readonly isUploading = signal(false);
  readonly deletingUrl = signal<string | null>(null);
  readonly freeSlots = computed(() => MAX_IMAGES - this.slides().length - this.pending().length);
  readonly maxImages = MAX_IMAGES;

  ngOnInit() {
    this.startAutoplay();
  }

  ngOnDestroy() {
    this.stopAutoplay();
    this.pending().forEach(p => URL.revokeObjectURL(p.preview));
  }

  private startAutoplay() {
    this.stopAutoplay();
    this.timer = setInterval(() => this.step(1), AUTOPLAY_MS);
  }

  private stopAutoplay() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  private step(delta: number) {
    const total = this.slides().length;
    if (total < 2) return;
    this.currentIndex.set((this.currentIndex() + delta + total) % total);
  }

  /** Navegación manual: reinicia el temporizador en lugar de detener el autoplay. */
  next() { this.step(1); this.startAutoplay(); }
  prev() { this.step(-1); this.startAutoplay(); }
  goToSlide(i: number) { this.currentIndex.set(i); this.startAutoplay(); }

  // --- Gestor de imágenes ---
  openModal() {
    this.pending.set([]);
    this.isModalOpen.set(true);
  }

  closeModal() {
    this.pending().forEach(p => URL.revokeObjectURL(p.preview));
    this.pending.set([]);
    this.isModalOpen.set(false);
  }

  onFilesSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    input.value = '';

    const images = files.filter(f => f.type.startsWith('image/'));
    if (images.length !== files.length) alerts.warning('Solo se permiten imágenes');

    const tooBig = images.filter(f => f.size > 5 * 1024 * 1024);
    if (tooBig.length) alerts.warning('Algunas imágenes superan los 5 MB y se han descartado');

    const accepted = images.filter(f => f.size <= 5 * 1024 * 1024).slice(0, Math.max(this.freeSlots(), 0));
    this.pending.update(list => [...list, ...accepted.map(file => ({ file, preview: URL.createObjectURL(file) }))]);
  }

  removePending(index: number) {
    const item = this.pending()[index];
    URL.revokeObjectURL(item.preview);
    this.pending.update(list => list.filter((_, i) => i !== index));
  }

  async removeImage(url: string) {
    const confirmed = await alerts.confirm({
      title: '¿Eliminar esta imagen?',
      text: 'Esta acción no se puede deshacer.',
      confirmText: 'Sí, eliminar',
      danger: true,
    });
    if (!confirmed) return;

    this.deletingUrl.set(url);
    try {
      await firstValueFrom(this.api.deleteBusinessImage(url));
      await this.store.loadBusinessInfo();
      this.currentIndex.set(0);
      alerts.success('Imagen eliminada');
    } catch (error) {
      alerts.error(error, 'No se ha podido eliminar la imagen');
    } finally {
      this.deletingUrl.set(null);
    }
  }

  async uploadPending() {
    if (!this.pending().length) return;
    this.isUploading.set(true);
    try {
      await firstValueFrom(this.api.uploadImages(this.pending().map(p => p.file)));
      await this.store.loadBusinessInfo();
      alerts.success('Imágenes subidas correctamente');
      this.closeModal();
    } catch (error) {
      alerts.error(error, 'No se han podido subir las imágenes');
    } finally {
      this.isUploading.set(false);
    }
  }
}
