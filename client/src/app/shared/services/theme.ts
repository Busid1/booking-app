/** Genera la paleta 50–950 de Tailwind a partir del color de marca y la aplica como variables CSS. */

const SHADES = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;
// Luminosidad objetivo de cada tono; el 600 es exactamente el color elegido.
const LIGHTNESS: Record<number, number> = { 50: 97, 100: 94, 200: 87, 300: 78, 400: 67, 500: 57, 700: 38, 800: 31, 900: 25, 950: 16 };

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHsl([r, g, b]: [number, number, number]): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l * 100];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s * 100, l * 100];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  s /= 100; l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
}

export function isValidHex(color: string | null | undefined): color is string {
  return !!color && /^#[0-9a-f]{6}$/i.test(color);
}

/** Aplica el color de marca (o restaura el predeterminado si no es válido). */
export function applyBrandColor(color: string | null | undefined) {
  const root = document.documentElement;
  if (!isValidHex(color)) {
    SHADES.forEach(shade => root.style.removeProperty(`--brand-${shade}`));
    return;
  }
  const base = hexToRgb(color);
  const [h, s] = rgbToHsl(base);
  for (const shade of SHADES) {
    const rgb = shade === 600 ? base : hslToRgb(h, Math.min(s, shade <= 100 ? 90 : 100), LIGHTNESS[shade]);
    root.style.setProperty(`--brand-${shade}`, rgb.join(' '));
  }
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', color);
}
