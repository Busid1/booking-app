import { SocialLinks } from '../interfaces/business-info.interface';

export interface SocialNetwork {
  key: keyof SocialLinks;
  label: string;
  icon: string;
  /** Color de la marca de la red social. */
  color: string;
  placeholder: string;
  /** Convierte un usuario o URL en un enlace completo. */
  toUrl: (value: string) => string;
}

const handle = (value: string) => value.trim().replace(/^@/, '');
const isUrl = (value: string) => /^https?:\/\//i.test(value.trim());

export const SOCIAL_NETWORKS: SocialNetwork[] = [
  {
    key: 'instagram', label: 'Instagram', icon: 'fab fa-instagram', color: '#E1306C', placeholder: '@tunegocio',
    toUrl: v => (isUrl(v) ? v.trim() : `https://instagram.com/${handle(v)}`),
  },
  {
    key: 'tiktok', label: 'TikTok', icon: 'fab fa-tiktok', color: '#000000', placeholder: '@tunegocio',
    toUrl: v => (isUrl(v) ? v.trim() : `https://www.tiktok.com/@${handle(v)}`),
  },
  {
    key: 'facebook', label: 'Facebook', icon: 'fab fa-facebook-f', color: '#1877F2', placeholder: 'tunegocio',
    toUrl: v => (isUrl(v) ? v.trim() : `https://facebook.com/${handle(v)}`),
  },
  {
    key: 'whatsapp', label: 'WhatsApp', icon: 'fab fa-whatsapp', color: '#25D366', placeholder: '+34 600 000 000',
    toUrl: v => (isUrl(v) ? v.trim() : `https://wa.me/${v.replace(/[^\d]/g, '')}`),
  },
  {
    key: 'x', label: 'X (Twitter)', icon: 'fab fa-x-twitter', color: '#000000', placeholder: '@tunegocio',
    toUrl: v => (isUrl(v) ? v.trim() : `https://x.com/${handle(v)}`),
  },
  {
    key: 'youtube', label: 'YouTube', icon: 'fab fa-youtube', color: '#FF0000', placeholder: '@tucanal',
    toUrl: v => (isUrl(v) ? v.trim() : `https://youtube.com/@${handle(v)}`),
  },
  {
    key: 'website', label: 'Web', icon: 'fas fa-globe', color: '#0f172a', placeholder: 'https://tunegocio.com',
    toUrl: v => (isUrl(v) ? v.trim() : `https://${v.trim()}`),
  },
];

/** Redes configuradas, listas para mostrar. */
export function activeSocials(info: SocialLinks): (SocialNetwork & { url: string; value: string })[] {
  return SOCIAL_NETWORKS.filter(n => info[n.key]?.trim()).map(n => ({ ...n, value: info[n.key]!.trim(), url: n.toUrl(info[n.key]!) }));
}
