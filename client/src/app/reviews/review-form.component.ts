import { Component, EventEmitter, inject, Input, OnChanges, Output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { ModalComponent } from '../shared/services/modal.component';
import { StarRatingComponent } from '../shared/services/star-rating.component';
import { ServicesService } from '../dashboard/admin/crud/services.service';
import { alerts } from '../shared/services/alerts';

/** Modal para valorar una cita terminada (con cuenta o con el código de la cita). */
@Component({
  selector: 'app-review-form',
  standalone: true,
  imports: [FormsModule, ModalComponent, StarRatingComponent],
  template: `
    <app-modal [open]="open" (closed)="closed.emit()" title="Valora tu cita" [subtitle]="subtitle" size="sm">
      <div class="flex flex-col items-center gap-2 py-2">
        <app-stars [value]="rating()" [editable]="true" size="2rem" (valueChange)="rating.set($event)" />
        <p class="h-5 text-sm font-semibold text-slate-600">{{ labels[rating()] }}</p>
      </div>
      <label class="label mt-4" for="review-comment">Comentario <span class="font-normal text-slate-400">(opcional)</span></label>
      <textarea id="review-comment" rows="4" maxlength="1000" class="input resize-none" [(ngModel)]="comment"
        placeholder="¿Qué te ha parecido? Tu opinión ayuda a otros clientes."></textarea>
      <p class="mt-2 text-xs text-slate-400">Se publicará con tu nombre abreviado.</p>

      <div modal-footer class="flex justify-end gap-2 border-t border-slate-100 px-5 py-4 sm:px-6">
        <button type="button" class="btn btn-secondary" (click)="closed.emit()">Cancelar</button>
        <button type="button" class="btn btn-primary" [disabled]="!rating() || sending()" (click)="send()">
          @if (sending()) { <span class="spinner size-4"></span> Enviando… } @else { Publicar reseña }
        </button>
      </div>
    </app-modal>
  `,
})
export class ReviewFormComponent implements OnChanges {
  private api = inject(ServicesService);

  @Input() open = false;
  @Input() subtitle = '';
  @Input() appointmentId?: string;
  @Input() manageToken?: string | null;
  @Output() closed = new EventEmitter<void>();
  @Output() sent = new EventEmitter<number>();

  readonly labels = ['', 'Muy mal', 'Mejorable', 'Bien', 'Muy bien', '¡Excelente!'];
  readonly rating = signal(0);
  readonly sending = signal(false);
  comment = '';

  ngOnChanges() {
    if (this.open) {
      this.rating.set(0);
      this.comment = '';
    }
  }

  async send() {
    this.sending.set(true);
    try {
      await firstValueFrom(this.api.createReview({
        rating: this.rating(),
        comment: this.comment.trim() || undefined,
        appointmentId: this.manageToken ? undefined : this.appointmentId,
        manageToken: this.manageToken || undefined,
      }));
      alerts.success('¡Gracias por tu reseña!');
      this.sent.emit(this.rating());
      this.closed.emit();
    } catch (error) {
      alerts.error(error, 'No se ha podido publicar la reseña');
    } finally {
      this.sending.set(false);
    }
  }
}
