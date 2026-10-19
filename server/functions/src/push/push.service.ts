import { Injectable, Logger } from '@nestjs/common';
import * as webpush from 'web-push';
import { PrismaService } from '../prisma/prisma.service';
import { PushSubscribeDto } from '../dto/push.dto';

export interface PushMessage {
  title: string;
  body: string;
  /** Ruta de la web que se abre al pulsar la notificación. */
  url?: string;
  /** Las notificaciones con el mismo tag se sustituyen en lugar de acumularse. */
  tag?: string;
}

/** Destinatarios de una notificación: usuarios con sesión y/o dispositivos con códigos de cita. */
export interface PushTarget {
  userIds?: (string | null | undefined)[];
  manageTokens?: (string | null | undefined)[];
}

const MAX_TOKENS_PER_DEVICE = 50;

/**
 * Notificaciones push con Web Push (VAPID).
 * Si faltan las claves VAPID los envíos se omiten. Nunca lanza errores.
 */
@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);
  private configured = false;

  constructor(private readonly prisma: PrismaService) {
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    if (!publicKey || !privateKey) return;
    try {
      webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:admin@example.com', publicKey, privateKey);
      this.configured = true;
    } catch (error) {
      this.logger.error('Claves VAPID no válidas: las notificaciones push quedan desactivadas', error as Error);
    }
  }

  get enabled(): boolean {
    return this.configured;
  }

  get publicKey(): string | null {
    return this.configured ? process.env.VAPID_PUBLIC_KEY! : null;
  }

  async subscribe(dto: PushSubscribeDto, userId: string | undefined) {
    const existing = await this.prisma.pushSubscription.findUnique({ where: { endpoint: dto.endpoint } });
    const tokens = [...new Set([...(dto.manageTokens ?? []), ...(existing?.manageTokens ?? [])])]
      .filter(t => t.length >= 20)
      .slice(0, MAX_TOKENS_PER_DEVICE);
    const data = {
      p256dh: dto.keys.p256dh,
      auth: dto.keys.auth,
      userId: userId ?? null,
      manageTokens: tokens,
    };
    await this.prisma.pushSubscription.upsert({
      where: { endpoint: dto.endpoint },
      create: { endpoint: dto.endpoint, ...data },
      update: data,
    });
    return { subscribed: true };
  }

  async unsubscribe(endpoint: string) {
    await this.prisma.pushSubscription.deleteMany({ where: { endpoint } });
    return { subscribed: false };
  }

  /** IDs de usuario de los administradores (reciben los avisos del negocio). */
  async adminUserIds(): Promise<string[]> {
    const admins = await this.prisma.user.findMany({ where: { role: 'admin' }, select: { id: true } });
    return admins.map(a => a.id);
  }

  async send(target: PushTarget, message: PushMessage): Promise<number> {
    if (!this.configured) return 0;
    const userIds = [...new Set((target.userIds ?? []).filter((id): id is string => !!id))];
    const tokens = [...new Set((target.manageTokens ?? []).filter((t): t is string => !!t))];
    if (!userIds.length && !tokens.length) return 0;

    try {
      const subs = await this.prisma.pushSubscription.findMany({
        where: {
          OR: [
            ...(userIds.length ? [{ userId: { in: userIds } }] : []),
            ...(tokens.length ? [{ manageTokens: { hasSome: tokens } }] : []),
          ],
        },
      });
      const payload = JSON.stringify({
        // Formato que entiende el service worker de Angular (ngsw).
        notification: {
          title: message.title,
          body: message.body,
          icon: '/icons/icon-192.png',
          badge: '/icons/badge-72.png',
          tag: message.tag,
          lang: 'es',
          data: {
            onActionClick: {
              default: { operation: 'navigateLastFocusedOrOpen', url: message.url || '/' },
            },
          },
        },
      });

      const results = await Promise.all(subs.map(async sub => {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            payload,
            { TTL: 24 * 60 * 60 },
          );
          return true;
        } catch (error: any) {
          // 404/410: el navegador ha anulado la suscripción.
          if (error?.statusCode === 404 || error?.statusCode === 410) {
            await this.prisma.pushSubscription.deleteMany({ where: { id: sub.id } });
          } else {
            this.logger.warn(`No se pudo enviar una notificación push (${error?.statusCode ?? error?.message})`);
          }
          return false;
        }
      }));
      return results.filter(Boolean).length;
    } catch (error) {
      this.logger.error('Error enviando notificaciones push', error as Error);
      return 0;
    }
  }
}
