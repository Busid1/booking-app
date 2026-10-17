import { HttpException, HttpStatus } from '@nestjs/common';

const buckets = new Map<string, number[]>();

function recent(key: string, windowMs: number): number[] {
  const now = Date.now();
  const list = (buckets.get(key) ?? []).filter(t => now - t < windowMs);
  buckets.set(key, list);
  if (buckets.size > 10_000) {
    for (const [k, times] of buckets) if (!times.some(t => now - t < windowMs)) buckets.delete(k);
  }
  return list;
}

/** Lanza 429 si `key` ya alcanzó `max` registros dentro de la ventana (sin registrar uno nuevo). */
export function assertUnderLimit(key: string, max: number, windowMs: number, message = 'Demasiados intentos. Inténtalo más tarde.') {
  if (recent(key, windowMs).length >= max) throw new HttpException(message, HttpStatus.TOO_MANY_REQUESTS);
}

/** Registra una acción para `key`. */
export function recordHit(key: string) {
  const list = buckets.get(key) ?? [];
  list.push(Date.now());
  buckets.set(key, list);
}

/**
 * Limitador sencillo en memoria (por instancia): comprueba y registra a la vez.
 * Lanza 429 si `key` supera `max` acciones dentro de `windowMs`.
 */
export function rateLimit(key: string, max: number, windowMs: number, message?: string) {
  assertUnderLimit(key, max, windowMs, message);
  recordHit(key);
}
