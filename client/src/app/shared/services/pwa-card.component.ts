import { Component, computed, inject, Input, signal } from '@angular/core';
import { PwaService } from './pwa.service';
import { alerts } from './alerts';

/**
 * Tarjeta para instalar la web como app y activar los avisos en este dispositivo.
 * `audience` cambia los textos: clientes (recordatorios) o negocio (nuevas reservas).
 */
@Component({
  selector: 'app-pwa-card',
  standalone: true,
  template: `
    @if (visible()) {
      <section class="card flex flex-wrap items-center gap-4 p-4 sm:p-5" [class.!shadow-none]="compact">
        <span class="grid size-11 shrink-0 place-items-center rounded-2xl bg-brand-50 text-lg text-brand-600">
          <i class="fas" [class.fa-bell]="!showInstall()" [class.fa-mobile-screen-button]="showInstall()"></i>
        </span>
        <div class="min-w-0 flex-1 text-left">
          <h2 class="font-bold text-slate-900">{{ heading() }}</h2>
          <p class="mt-0.5 text-sm text-slate-500">{{ text() }}</p>
        </div>
        <div class="flex w-full flex-wrap gap-2 sm:w-auto">
          @if (showInstall()) {
            <button type="button" class="btn btn-primary btn-sm flex-1 sm:flex-none" (click)="install()">
              <i class="fas fa-download"></i> Instalar app
            </button>
          }
          @switch (pwa.pushState()) {
            @case ('off') {
              <button type="button" class="btn btn-sm flex-1 sm:flex-none" [class.btn-secondary]="showInstall()" [class.btn-primary]="!showInstall()"
                (click)="enable()" [disabled]="busy()">
                @if (busy()) { <span class="spinner size-3.5"></span> } @else { <i class="fas fa-bell"></i> }
                Activar avisos
              </button>
            }
            @case ('on') {
              <button type="button" class="btn btn-secondary btn-sm flex-1 sm:flex-none" (click)="disable()" [disabled]="busy()"
                title="Dejar de recibir avisos en este dispositivo">
                <i class="fas fa-bell-slash"></i> Desactivar avisos
              </button>
            }
          }
        </div>
      </section>
    }
  `,
})
export class PwaCardComponent {
  readonly pwa = inject(PwaService);

  @Input() audience: 'client' | 'business' = 'client';
  /** Sin sombra, para usarla dentro de otras tarjetas o modales. */
  @Input() compact = false;

  readonly busy = signal(false);

  readonly showInstall = computed(() => this.pwa.canInstall());

  /** Solo se muestra si hay algo que hacer (instalar o activar avisos). */
  readonly visible = computed(() => this.showInstall() || this.pwa.pushState() === 'off');

  readonly heading = computed(() => {
    if (this.pwa.pushState() === 'on') return 'Avisos activados en este dispositivo';
    if (this.showInstall()) return 'Instala la app en tu móvil';
    return this.audience === 'business' ? 'Avisos de nuevas reservas' : 'Recibe un recordatorio';
  });

  readonly text = computed(() => {
    const business = this.audience === 'business';
    if (this.pwa.pushState() === 'on') {
      return business
        ? 'Te avisaremos al momento de cada reserva nueva y de las cancelaciones.'
        : 'Te avisaremos antes de tu cita y si hay algún cambio.';
    }
    if (this.showInstall()) {
      const extra = this.pwa.pushState() === 'needs-install' ? ' En iPhone, los avisos solo funcionan con la app instalada.' : '';
      return (business
        ? 'Abre tu agenda con un toque desde la pantalla de inicio y recibe avisos de nuevas reservas.'
        : 'Reserva en segundos desde la pantalla de inicio y recibe recordatorios de tus citas.') + extra;
    }
    return business
      ? 'Recibe un aviso al momento cuando un cliente reserve o cancele.'
      : 'Activa los avisos y te recordaremos la cita en este dispositivo.';
  });

  install() {
    this.pwa.install();
  }

  async enable() {
    this.busy.set(true);
    try {
      if (await this.pwa.enablePush()) alerts.success('Avisos activados');
    } catch {
      if (this.pwa.pushState() === 'blocked') {
        alerts.warning('Has bloqueado los avisos', 'Permite las notificaciones de esta web en los ajustes del navegador.');
      } else {
        alerts.warning('No se han podido activar los avisos', 'Inténtalo de nuevo en unos segundos.');
      }
    } finally {
      this.busy.set(false);
    }
  }

  async disable() {
    this.busy.set(true);
    try {
      await this.pwa.disablePush();
      alerts.info('Avisos desactivados');
    } finally {
      this.busy.set(false);
    }
  }
}
