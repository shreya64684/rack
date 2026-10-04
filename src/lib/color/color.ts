export interface Rgb {
  r: number;
  g: number;
  b: number;
}

/** h in degrees [0, 360), s and l in [0, 1]. */
export interface Hsl {
  h: number;
  s: number;
  l: number;
}

const HEX_RE = /^#?([0-9a-f]{6})$/i;

export function isHex(value: string): boolean {
  return HEX_RE.test(value);
}

export function hexToRgb(hex: string): Rgb {
  const match = HEX_RE.exec(hex);
  if (!match) throw new Error(`Invalid hex colour: ${hex}`);
  const n = parseInt(match[1], 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

export function rgbToHex({ r, g, b }: Rgb): string {
  const part = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return `#${part(r)}${part(g)}${part(b)}`;
}

export function rgbToHsl({ r, g, b }: Rgb): Hsl {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return { h: 0, s: 0, l };
  const s = d / (1 - Math.abs(2 * l - 1));
  let h: number;
  if (max === rn) h = ((gn - bn) / d) % 6;
  else if (max === gn) h = (bn - rn) / d + 2;
  else h = (rn - gn) / d + 4;
  h *= 60;
  if (h < 0) h += 360;
  return { h, s, l };
}

export const hexToHsl = (hex: string): Hsl => rgbToHsl(hexToRgb(hex));

/** Shortest distance between two hues on the colour wheel, 0–180. */
export function hueDistance(a: number, b: number): number {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

/** "Redmean" perceptual approximation; cheap and good enough for naming and dedupe. */
export function colorDistance(a: Rgb, b: Rgb): number {
  const rMean = (a.r + b.r) / 2;
  const dr = a.r - b.r;
  const dg = a.g - b.g;
  const db = a.b - b.b;
  return Math.sqrt((2 + rMean / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rMean) / 256) * db * db);
}

/** Relative luminance per WCAG 2.x. */
export function luminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  const ch = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * ch(r) + 0.7152 * ch(g) + 0.0722 * ch(b);
}

export function contrastRatio(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** Wardrobe vocabulary, not CSS names: these are what people call clothes. */
export const NAMED_COLORS: ReadonlyArray<{ name: string; hex: string }> = [
  { name: 'White', hex: '#f7f7f5' },
  { name: 'Cream', hex: '#efe6d2' },
  { name: 'Beige', hex: '#d8c3a5' },
  { name: 'Camel', hex: '#b7895a' },
  { name: 'Tan', hex: '#a47a4f' },
  { name: 'Brown', hex: '#5e4030' },
  { name: 'Chocolate', hex: '#3d2a22' },
  { name: 'Black', hex: '#161616' },
  { name: 'Charcoal', hex: '#3a3b3d' },
  { name: 'Grey', hex: '#8e9095' },
  { name: 'Light grey', hex: '#c8cacc' },
  { name: 'Navy', hex: '#1f2a44' },
  { name: 'Denim blue', hex: '#3f5f86' },
  { name: 'Light blue', hex: '#a9c4e0' },
  { name: 'Cobalt', hex: '#1f4fbf' },
  { name: 'Teal', hex: '#1f7373' },
  { name: 'Sage', hex: '#9caf88' },
  { name: 'Olive', hex: '#6b6b3a' },
  { name: 'Forest green', hex: '#24452f' },
  { name: 'Emerald', hex: '#1a8a5a' },
  { name: 'Mustard', hex: '#d4a52c' },
  { name: 'Yellow', hex: '#f2d544' },
  { name: 'Rust', hex: '#a9512c' },
  { name: 'Orange', hex: '#e8772e' },
  { name: 'Red', hex: '#c62828' },
  { name: 'Burgundy', hex: '#6d1f2f' },
  { name: 'Pink', hex: '#e9a3b6' },
  { name: 'Fuchsia', hex: '#c2287a' },
  { name: 'Lilac', hex: '#b9a3d1' },
  { name: 'Purple', hex: '#5b2d82' },
  { name: 'Coral', hex: '#ec7a6a' },
  { name: 'Blush', hex: '#efc6c0' },
];

/** sRGB → CIELAB (D65). */
export function rgbToLab({ r, g, b }: Rgb): [number, number, number] {
  const lin = (v: number) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const [R, G, B] = [lin(r), lin(g), lin(b)];
  const f = (t: number) => (t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116);
  const x = f((0.4124 * R + 0.3576 * G + 0.1805 * B) / 0.95047);
  const y = f(0.2126 * R + 0.7152 * G + 0.0722 * B);
  const z = f((0.0193 * R + 0.1192 * G + 0.9505 * B) / 1.08883);
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
}

const NAMED_LAB = NAMED_COLORS.map((c) => ({ name: c.name, lab: rgbToLab(hexToRgb(c.hex)) }));

/** Nearest wardrobe colour name by CIE76 distance (perceptual enough for naming). */
export function nameColor(hex: string): string {
  const [l, a, b] = rgbToLab(hexToRgb(hex));
  let best = NAMED_LAB[0];
  let bestD = Infinity;
  for (const c of NAMED_LAB) {
    const d = (l - c.lab[0]) ** 2 + (a - c.lab[1]) ** 2 + (b - c.lab[2]) ** 2;
    if (d < bestD) {
      bestD = d;
      best = c;
    }
  }
  return best.name;
}
