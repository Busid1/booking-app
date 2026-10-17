import { Component, Input } from '@angular/core';

/** Contenedor visual común para las pantallas de login y registro. */
@Component({
  selector: 'app-auth-layout',
  standalone: true,
  template: `
    <div class="container-page grid place-items-center py-6 sm:py-10">
      <div class="card grid w-full max-w-4xl animate-slide-up overflow-hidden md:grid-cols-[1fr_1.1fr]">
        <aside class="relative hidden overflow-hidden bg-gradient-to-br from-brand-600 via-brand-700 to-indigo-900 p-10 text-white md:flex md:flex-col md:justify-between">
          <div class="absolute -right-24 -top-24 size-72 rounded-full bg-white/10 blur-2xl"></div>
          <div class="absolute -bottom-32 -left-16 size-80 rounded-full bg-accent-400/20 blur-3xl"></div>

          <div class="relative">
            <span class="grid size-11 place-items-center rounded-2xl bg-white/15 text-lg backdrop-blur"><i class="fas fa-calendar-check"></i></span>
            <h2 class="mt-8 text-3xl font-extrabold leading-tight text-white">Tu próxima cita,<br>a un par de clics.</h2>
            <p class="mt-3 text-sm leading-relaxed text-brand-100">Reserva cuando quieras, consulta tus citas y cancélalas si lo necesitas. Sin llamadas ni esperas.</p>
          </div>

          <ul class="relative space-y-3 text-sm text-brand-50">
            <li class="flex items-center gap-3"><i class="fas fa-circle-check text-accent-300"></i> Disponibilidad en tiempo real</li>
            <li class="flex items-center gap-3"><i class="fas fa-circle-check text-accent-300"></i> Confirmación inmediata</li>
            <li class="flex items-center gap-3"><i class="fas fa-circle-check text-accent-300"></i> Gestiona tus reservas online</li>
          </ul>
        </aside>

        <section class="p-6 sm:p-10">
          <h1 class="text-2xl font-extrabold">{{ title }}</h1>
          <p class="mt-1.5 text-sm text-slate-500">{{ subtitle }}</p>
          <div class="mt-8">
            <ng-content></ng-content>
          </div>
        </section>
      </div>
    </div>
  `,
})
export class AuthLayoutComponent {
  @Input() title = '';
  @Input() subtitle = '';
}
