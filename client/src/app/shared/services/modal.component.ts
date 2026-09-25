import { Component, EventEmitter, HostListener, Input, OnDestroy, Output } from '@angular/core';

let openModals = 0;

/**
 * Modal accesible y ligero controlado por Angular (sustituye a los modales de Flowbite).
 * Uso: <app-modal [open]="isOpen" (closed)="isOpen = false" title="..."> contenido <div modal-footer>...</div></app-modal>
 */
@Component({
  selector: 'app-modal',
  standalone: true,
  template: `
    @if (open) {
      <div class="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true"
        [attr.aria-label]="title">
        <div class="absolute inset-0 animate-fade-in bg-slate-900/50 backdrop-blur-sm" (click)="dismissible && close()"></div>

        <div class="relative flex max-h-[92vh] w-full animate-pop-in flex-col overflow-hidden rounded-t-3xl bg-white shadow-lift sm:rounded-3xl"
          [class.sm:max-w-md]="size === 'sm'" [class.sm:max-w-xl]="size === 'md'" [class.sm:max-w-3xl]="size === 'lg'">
          <header class="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4 sm:px-6">
            <div>
              <h2 class="text-lg font-bold">{{ title }}</h2>
              @if (subtitle) {
                <p class="mt-0.5 text-sm text-slate-500">{{ subtitle }}</p>
              }
            </div>
            @if (dismissible) {
              <button type="button" class="btn-icon -mr-2 shrink-0" (click)="close()" aria-label="Cerrar">
                <i class="fas fa-times"></i>
              </button>
            }
          </header>

          <div class="flex-1 overflow-y-auto px-5 py-5 sm:px-6">
            <ng-content></ng-content>
          </div>

          <ng-content select="[modal-footer]"></ng-content>
        </div>
      </div>
    }
  `,
})
export class ModalComponent implements OnDestroy {
  private _open = false;

  @Input() title = '';
  @Input() subtitle = '';
  @Input() size: 'sm' | 'md' | 'lg' = 'md';
  @Input() dismissible = true;

  @Input()
  set open(value: boolean) {
    if (value === this._open) return;
    this._open = value;
    openModals += value ? 1 : -1;
    document.body.style.overflow = openModals > 0 ? 'hidden' : '';
  }
  get open() {
    return this._open;
  }

  @Output() closed = new EventEmitter<void>();

  @HostListener('document:keydown.escape')
  onEscape() {
    if (this.open && this.dismissible) this.close();
  }

  close() {
    this.closed.emit();
  }

  ngOnDestroy() {
    this.open = false;
  }
}
