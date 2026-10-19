import { Component, ElementRef, HostListener, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter } from 'rxjs';
import { NgTemplateOutlet } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../auth/auth.service';
import { alerts } from '../shared/services/alerts';
import { SharedService } from '../shared/services/shared.service';
import { PwaService } from '../shared/services/pwa.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, NgTemplateOutlet],
  templateUrl: './header.component.html',
})
export default class HeaderComponent {
  readonly auth = inject(AuthService);
  readonly store = inject(SharedService);
  readonly pwa = inject(PwaService);
  private router = inject(Router);
  private host = inject(ElementRef<HTMLElement>);

  readonly mobileOpen = signal(false);
  readonly userMenuOpen = signal(false);
  readonly scrolled = signal(false);

  constructor() {
    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd), takeUntilDestroyed())
      .subscribe(() => this.closeMenus());
  }

  @HostListener('window:scroll')
  onScroll() {
    this.scrolled.set(window.scrollY > 8);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (!this.host.nativeElement.contains(event.target as Node)) this.closeMenus();
  }

  closeMenus() {
    this.mobileOpen.set(false);
    this.userMenuOpen.set(false);
  }

  initials(): string {
    const user = this.auth.user();
    const source = user?.name || user?.email || '?';
    return source
      .split(/\s+/)
      .slice(0, 2)
      .map(part => part[0]?.toUpperCase() ?? '')
      .join('');
  }

  install() {
    this.closeMenus();
    this.pwa.install();
  }

  async togglePush() {
    this.closeMenus();
    try {
      if (this.pwa.pushState() === 'on') {
        await this.pwa.disablePush();
        alerts.info('Avisos desactivados');
      } else if (await this.pwa.enablePush()) {
        alerts.success('Avisos activados');
      }
    } catch {
      if (this.pwa.pushState() === 'blocked') {
        alerts.warning('Has bloqueado los avisos', 'Permite las notificaciones de esta web en los ajustes del navegador.');
      } else {
        alerts.warning('No se han podido activar los avisos', 'Inténtalo de nuevo en unos segundos.');
      }
    }
  }

  logout() {
    this.closeMenus();
    this.auth.logout('/');
    alerts.info('Has cerrado sesión');
  }
}
