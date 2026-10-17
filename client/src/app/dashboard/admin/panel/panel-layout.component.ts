import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../../auth/auth.service';

/** Contenedor del panel con pestañas: agenda, equipo y reseñas. */
@Component({
  selector: 'app-panel-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    @if (auth.isAdmin()) {
      <div class="container-page mb-6">
        <nav class="inline-flex max-w-full gap-1 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-1 shadow-sm" aria-label="Secciones del panel">
          @for (tab of tabs; track tab.path) {
            <a [routerLink]="tab.path" routerLinkActive="!bg-brand-600 !text-white shadow" [routerLinkActiveOptions]="{ exact: true }"
              class="flex shrink-0 items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 transition hover:text-slate-900">
              <i class="fas {{ tab.icon }} text-xs"></i> {{ tab.label }}
            </a>
          }
        </nav>
      </div>
    }
    <router-outlet />
  `,
})
export default class PanelLayoutComponent {
  readonly auth = inject(AuthService);
  readonly tabs = [
    { path: '/panel', label: 'Agenda', icon: 'fa-calendar-days' },
    { path: '/panel/equipo', label: 'Equipo', icon: 'fa-user-group' },
    { path: '/panel/resenas', label: 'Reseñas', icon: 'fa-star' },
  ];
}
