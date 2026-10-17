import { BadRequestException, Logger } from '@nestjs/common';
import { appConfig } from './app-config';

const logger = new Logger('Turnstile');

/** Verifica el token anti-bots de Cloudflare Turnstile. Si no está configurado, no hace nada. */
export async function verifyTurnstile(token: string | undefined, ip: string): Promise<void> {
  const secret = appConfig.turnstileSecret;
  if (!secret) return;
  if (!token) throw new BadRequestException('Completa la verificación anti-bots');

  try {
    const body = new URLSearchParams({ secret, response: token, remoteip: ip });
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body });
    const data = (await res.json()) as { success: boolean; 'error-codes'?: string[] };
    if (!data.success) {
      logger.warn(`Verificación fallida: ${data['error-codes']?.join(', ')}`);
      throw new BadRequestException('La verificación anti-bots ha fallado. Recarga la página e inténtalo de nuevo.');
    }
  } catch (error) {
    if (error instanceof BadRequestException) throw error;
    logger.error('No se pudo contactar con Turnstile', error as Error);
    throw new BadRequestException('No se ha podido verificar que no eres un bot. Inténtalo de nuevo.');
  }
}
