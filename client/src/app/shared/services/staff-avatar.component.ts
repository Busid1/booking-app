import { Component, Input } from '@angular/core';

/** Foto del profesional o sus iniciales sobre su color. */
@Component({
  selector: 'app-staff-avatar',
  standalone: true,
  template: `
    @if (photo) {
      <img [src]="photo" [alt]="name" class="h-full w-full rounded-full object-cover" loading="lazy" />
    } @else {
      <span class="grid h-full w-full place-items-center rounded-full font-bold text-white" [style.background-color]="color || '#64748b'"
        [style.font-size]="fontSize">{{ initials }}</span>
    }
  `,
  host: { class: 'block shrink-0' },
})
export class StaffAvatarComponent {
  @Input() name = '';
  @Input() photo?: string | null;
  @Input() color?: string | null;
  @Input() fontSize = '0.8rem';

  get initials(): string {
    return this.name.split(/\s+/).slice(0, 2).map(p => p[0]?.toUpperCase() ?? '').join('') || '?';
  }
}
