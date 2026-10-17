import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { ServicesService } from '../crud/services.service';
import { StarRatingComponent } from '../../../shared/services/star-rating.component';
import { AdminReview } from '../../../shared/interfaces/review.interface';
import { alerts } from '../../../shared/services/alerts';

/** Moderación de reseñas: ocultar, mostrar o eliminar. */
@Component({
  selector: 'app-reviews-admin',
  standalone: true,
  imports: [DatePipe, StarRatingComponent],
  template: `
    <div class="container-page max-w-4xl">
      <header class="flex flex-wrap items-end justify-between gap-4">
        <div class="animate-slide-up">
          <p class="eyebrow">Administración</p>
          <h1 class="mt-1 text-3xl font-extrabold sm:text-4xl">Reseñas</h1>
          <p class="mt-1 text-slate-500">Solo pueden opinar clientes con una cita terminada. Puedes ocultar las que no quieras mostrar.</p>
        </div>
        @if (stats().count) {
          <div class="card flex items-center gap-3 px-5 py-3">
            <span class="text-3xl font-extrabold text-slate-900">{{ stats().average }}</span>
            <div>
              <app-stars [value]="stats().average" />
              <p class="text-xs text-slate-500">{{ stats().count }} reseñas visibles</p>
            </div>
          </div>
        }
      </header>

      <section class="mt-8 space-y-3">
        @if (isLoading()) {
          @for (i of [1, 2, 3]; track i) { <div class="skeleton h-28"></div> }
        } @else {
          @for (review of reviews(); track review.id) {
            <article class="card p-5" [class.opacity-60]="!review.visible">
              <div class="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div class="flex items-center gap-3">
                    <app-stars [value]="review.rating" />
                    <span class="font-bold text-slate-900">{{ review.authorName }}</span>
                    @if (!review.visible) { <span class="badge bg-slate-100 text-slate-500"><i class="fas fa-eye-slash"></i> Oculta</span> }
                  </div>
                  <p class="mt-1 text-xs text-slate-500">
                    {{ review.createdAt | date: 'd MMM y' }}
                    @if (review.appointment) { · {{ review.appointment.service.title }} }
                    @if (review.staff) { · con {{ review.staff.name }} }
                  </p>
                </div>
                <div class="flex gap-2">
                  <button type="button" class="btn btn-secondary btn-sm" (click)="toggle(review)">
                    <i class="fas" [class.fa-eye-slash]="review.visible" [class.fa-eye]="!review.visible"></i>
                    {{ review.visible ? 'Ocultar' : 'Mostrar' }}
                  </button>
                  <button type="button" class="btn btn-secondary btn-sm text-rose-600 hover:bg-rose-50" (click)="remove(review)" aria-label="Eliminar">
                    <i class="fas fa-trash-can"></i>
                  </button>
                </div>
              </div>
              @if (review.comment) {
                <p class="mt-3 whitespace-pre-line text-slate-700">{{ review.comment }}</p>
              }
            </article>
          } @empty {
            <div class="card flex flex-col items-center gap-3 p-12 text-center">
              <span class="grid size-14 place-items-center rounded-full bg-amber-50 text-xl text-amber-500"><i class="far fa-star"></i></span>
              <h2 class="text-lg font-bold">Aún no hay reseñas</h2>
              <p class="text-sm text-slate-500">Tus clientes podrán valorar sus citas una vez terminadas.</p>
            </div>
          }
        }
      </section>
    </div>
  `,
})
export default class ReviewsAdminComponent implements OnInit {
  private api = inject(ServicesService);
  readonly reviews = signal<AdminReview[]>([]);
  readonly isLoading = signal(true);

  readonly stats = computed(() => {
    const visible = this.reviews().filter(r => r.visible);
    const avg = visible.length ? visible.reduce((s, r) => s + r.rating, 0) / visible.length : 0;
    return { count: visible.length, average: Math.round(avg * 10) / 10 };
  });

  async ngOnInit() {
    try {
      this.reviews.set(await firstValueFrom(this.api.getAllReviews()));
    } catch (error) {
      alerts.error(error, 'No se han podido cargar las reseñas');
    } finally {
      this.isLoading.set(false);
    }
  }

  async toggle(review: AdminReview) {
    try {
      await firstValueFrom(this.api.setReviewVisible(review.id, !review.visible));
      this.reviews.update(list => list.map(r => (r.id === review.id ? { ...r, visible: !r.visible } : r)));
    } catch (error) {
      alerts.error(error);
    }
  }

  async remove(review: AdminReview) {
    const ok = await alerts.confirm({ title: '¿Eliminar esta reseña?', text: 'No se puede deshacer.', confirmText: 'Eliminar', danger: true });
    if (!ok) return;
    try {
      await firstValueFrom(this.api.deleteReview(review.id));
      this.reviews.update(list => list.filter(r => r.id !== review.id));
      alerts.success('Reseña eliminada');
    } catch (error) {
      alerts.error(error);
    }
  }
}
