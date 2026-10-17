import { AfterViewInit, Component, ElementRef, EventEmitter, Input, OnDestroy, Output, ViewChild } from '@angular/core';

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string;
      remove: (id: string) => void;
      reset: (id: string) => void;
    };
  }
}

let scriptPromise: Promise<void> | null = null;

function loadScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  scriptPromise ??= new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      scriptPromise = null;
      reject(new Error('No se pudo cargar Turnstile'));
    };
    document.head.appendChild(script);
  });
  return scriptPromise;
}

/** Verificación anti-bots de Cloudflare Turnstile (normalmente invisible para el usuario). */
@Component({
  selector: 'app-turnstile',
  standalone: true,
  template: `<div #container class="min-h-[65px]"></div>`,
})
export class TurnstileComponent implements AfterViewInit, OnDestroy {
  @Input({ required: true }) siteKey = '';
  @Output() token = new EventEmitter<string | null>();
  @ViewChild('container', { static: true }) container!: ElementRef<HTMLDivElement>;

  private widgetId: string | null = null;

  async ngAfterViewInit() {
    try {
      await loadScript();
      if (!window.turnstile) return;
      this.widgetId = window.turnstile.render(this.container.nativeElement, {
        sitekey: this.siteKey,
        language: 'es',
        callback: (t: string) => this.token.emit(t),
        'expired-callback': () => this.token.emit(null),
        'error-callback': () => this.token.emit(null),
      });
    } catch {
      this.token.emit(null);
    }
  }

  reset() {
    if (this.widgetId && window.turnstile) window.turnstile.reset(this.widgetId);
    this.token.emit(null);
  }

  ngOnDestroy() {
    if (this.widgetId && window.turnstile) window.turnstile.remove(this.widgetId);
  }
}
