import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { NavigationEnd, Router } from '@angular/router';
import { SwPush, SwUpdate } from '@angular/service-worker';
import { filter, firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../auth/auth.service';
import { GuestBookingsService } from './guest-bookings.service';
import { SharedService } from './shared.service';

/** Evento no estándar de Chrome/Edge/Android para instalar la web como app. */
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export type PushState = 'unavailable' | 'needs-install' | 'off' | 'on' | 'blocked';

/**
 * Web instalable (PWA): instalación en la pantalla de inicio, avisos push y actualizaciones.
 */
@Injectable({ providedIn: 'root' })
export class PwaService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private swPush = inject(SwPush);
  private swUpdate = inject(SwUpdate);
  private auth = inject(AuthService);
  private guestBookings = inject(GuestBookingsService);
  private store = inject(SharedService);

  private installEvent: BeforeInstallPromptEvent | null = null;

  readonly isIos = /iphone|ipad|ipod/i.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  readonly standalone = signal(
    window.matchMedia?.('(display-mode: standalone)').matches || (navigator as any).standalone === true,
  );
  /** El navegador ofrece instalar (Chrome, Edge, Android). */
  readonly canPrompt = signal(false);
  /** Mostrar «Instalar app»: con aviso del navegador o con instrucciones (iPhone). */
  readonly canInstall = computed(() => !this.standalone() && (this.canPrompt() || this.isIos));

  private readonly subscription = signal<PushSubscription | null>(null);
  private readonly permission = signal<NotificationPermission | 'unsupported'>(
    'Notification' in window ? Notification.permission : 'unsupported',
  );

  readonly pushState = computed<PushState>(() => {
    if (!this.store.config()?.vapidPublicKey) return 'unavailable';
    // En iPhone los avisos solo existen con la web instalada en la pantalla de inicio.
    if (this.isIos && !this.standalone()) return 'needs-install';
    if (!this.swPush.isEnabled || this.permission() === 'unsupported') return 'unavailable';
    if (this.permission() === 'denied') return 'blocked';
    return this.subscription() ? 'on' : 'off';
  });

  constructor() {
    window.addEventListener('beforeinstallprompt', event => {
      event.preventDefault();
      this.installEvent = event as BeforeInstallPromptEvent;
      this.canPrompt.set(true);
    });
    window.addEventListener('appinstalled', () => {
      this.installEvent = null;
      this.canPrompt.set(false);
      this.standalone.set(true);
    });

    if (this.swPush.isEnabled) {
      // Al pulsar una notificación, el service worker abre la web en la página indicada.
      this.swPush.subscription.subscribe(sub => this.subscription.set(sub));
    }

    this.watchUpdates();

    // Cada dispositivo suscrito se asocia al usuario con sesión y a las citas sin cuenta:
    // se vuelve a registrar cuando cambia cualquiera de los dos.
    effect(() => {
      this.auth.token();
      this.guestBookings.tokens();
      const sub = this.subscription();
      if (sub) untracked(() => this.register(sub).catch(() => undefined));
    });
  }

  /** Instrucciones de instalación para iPhone/iPad abiertas. */
  readonly iosHelp = signal(false);

  /** Abre el diálogo de instalación del navegador, o las instrucciones si no lo hay (iPhone). */
  async install(): Promise<void> {
    if (!this.installEvent) {
      this.iosHelp.set(true);
      return;
    }
    await this.installEvent.prompt();
    const { outcome } = await this.installEvent.userChoice;
    this.installEvent = null;
    this.canPrompt.set(false);
    if (outcome === 'accepted') this.standalone.set(true);
  }

  async enablePush(): Promise<boolean> {
    const config = await this.store.loadConfig();
    if (!config?.vapidPublicKey || !this.swPush.isEnabled) return false;
    try {
      const sub = await this.swPush.requestSubscription({ serverPublicKey: config.vapidPublicKey });
      await this.register(sub);
      return true;
    } finally {
      this.permission.set(Notification.permission);
    }
  }

  async disablePush() {
    const sub = this.subscription();
    if (!sub) return;
    await firstValueFrom(this.http.post(`${environment.apiUrl}/push/unsubscribe`, { endpoint: sub.endpoint })).catch(() => undefined);
    await this.swPush.unsubscribe();
  }

  private async register(sub: PushSubscription) {
    const json = sub.toJSON();
    await firstValueFrom(this.http.post(`${environment.apiUrl}/push/subscribe`, {
      endpoint: json.endpoint,
      keys: json.keys,
      manageTokens: this.guestBookings.tokens(),
    }));
  }

  /** Aplica las versiones nuevas de la web en la siguiente navegación, sin interrumpir. */
  private watchUpdates() {
    if (!this.swUpdate.isEnabled) return;
    let ready = false;
    this.swUpdate.versionUpdates.pipe(filter(e => e.type === 'VERSION_READY')).subscribe(() => (ready = true));
    this.swUpdate.unrecoverable.subscribe(() => location.reload());
    this.router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe(() => {
      if (ready) location.reload();
    });
    // Comprueba si hay versión nueva al volver a la app.
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') this.swUpdate.checkForUpdate().catch(() => undefined);
    });
  }
}
