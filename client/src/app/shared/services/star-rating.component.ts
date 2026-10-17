import { Component, EventEmitter, Input, Output } from '@angular/core';

const STAR_PATH = 'M12 2.5l2.94 5.96 6.58.96-4.76 4.64 1.12 6.55L12 17.52l-5.88 3.09 1.12-6.55L2.48 9.42l6.58-.96L12 2.5z';

/** Estrellas de valoración (SVG, sin depender de fuentes de iconos): solo lectura o seleccionables. */
@Component({
  selector: 'app-stars',
  standalone: true,
  template: `
    <span class="inline-flex items-center gap-0.5 align-middle" [attr.aria-label]="editable ? null : value + ' de 5 estrellas'"
      [attr.role]="editable ? 'radiogroup' : 'img'">
      @for (i of [1, 2, 3, 4, 5]; track i) {
        @if (editable) {
          <button type="button" (click)="valueChange.emit(i)" (mouseenter)="hover = i" (mouseleave)="hover = 0"
            class="rounded transition hover:scale-110 focus-visible:ring-2 focus-visible:ring-amber-300" role="radio"
            [attr.aria-label]="i + (i === 1 ? ' estrella' : ' estrellas')" [attr.aria-checked]="value === i">
            <svg viewBox="0 0 24 24" [style.width]="size" [style.height]="size" aria-hidden="true">
              <path [attr.d]="path" [attr.fill]="(hover || value) >= i ? '#fbbf24' : '#e2e8f0'" />
            </svg>
          </button>
        } @else {
          <svg viewBox="0 0 24 24" [style.width]="size" [style.height]="size" aria-hidden="true">
            <path [attr.d]="path" [attr.fill]="round >= i ? '#fbbf24' : '#e2e8f0'" />
          </svg>
        }
      }
    </span>
  `,
})
export class StarRatingComponent {
  @Input() value = 0;
  @Input() editable = false;
  @Input() size = '1rem';
  @Output() valueChange = new EventEmitter<number>();
  hover = 0;
  readonly path = STAR_PATH;

  get round(): number {
    return Math.round(this.value);
  }
}
