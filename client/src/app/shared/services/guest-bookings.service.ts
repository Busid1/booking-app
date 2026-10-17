import { Injectable, signal } from '@angular/core';

const KEY = 'bookly.guestAppointments';

/**
 * Códigos de gestión de las citas reservadas sin cuenta, guardados en este navegador.
 * Permiten ver y cancelar esas citas desde «Mis citas» sin iniciar sesión.
 */
@Injectable({ providedIn: 'root' })
export class GuestBookingsService {
  readonly tokens = signal<string[]>(this.read());

  private read(): string[] {
    try {
      const value = JSON.parse(localStorage.getItem(KEY) ?? '[]');
      return Array.isArray(value) ? value.filter(t => typeof t === 'string').slice(-50) : [];
    } catch {
      return [];
    }
  }

  private write(tokens: string[]) {
    this.tokens.set(tokens);
    try {
      localStorage.setItem(KEY, JSON.stringify(tokens));
    } catch {
      /* almacenamiento no disponible */
    }
  }

  add(token: string | null | undefined) {
    if (!token || this.tokens().includes(token)) return;
    this.write([...this.tokens(), token].slice(-50));
  }

  remove(token: string) {
    this.write(this.tokens().filter(t => t !== token));
  }

  /** Quita los códigos que ya no corresponden a ninguna cita. */
  keepOnly(valid: string[]) {
    this.write(this.tokens().filter(t => valid.includes(t)));
  }
}
