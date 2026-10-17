import { Component, ElementRef, HostListener, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter } from 'rxjs';
import { NgTemplateOutlet } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../auth/auth.service';
import { alerts } from '../shared/services/alerts';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, NgTemplateOutlet],
  templateUrl: './header.component.html',
})
export default class HeaderComponent {
  readonly auth = inject(AuthService);
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

  logout() {
    this.closeMenus();
    this.auth.logout('/');
    alerts.info('Has cerrado sesión');
  }
}
