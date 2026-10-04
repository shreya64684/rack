import { colorDistance, rgbToHex, type Rgb } from './color';

/** Pixels within this redmean distance of the estimated backdrop are treated as background. */
const BACKGROUND_THRESHOLD = 60;
const BORDER = 2;
const FALLBACK = '#808080';

interface Bin {
  weight: number;
  r: number;
  g: number;
  b: number;
}

const binKey = (r: number, g: number, b: number) => ((r >> 5) << 6) | ((g >> 5) << 3) | (b >> 5);

function addTo(bins: Map<number, Bin>, r: number, g: number, b: number, w: number) {
  const key = binKey(r, g, b);
  const bin = bins.get(key) ?? { weight: 0, r: 0, g: 0, b: 0 };
  bin.weight += w;
  bin.r += r * w;
  bin.g += g * w;
  bin.b += b * w;
  bins.set(key, bin);
}

function heaviest(bins: Map<number, Bin>): Rgb | null {
  let top: Bin | null = null;
  for (const bin of bins.values()) if (!top || bin.weight > top.weight) top = bin;
  return top ? { r: top.r / top.weight, g: top.g / top.weight, b: top.b / top.weight } : null;
}

/**
 * Dominant garment colour from RGBA pixels (ADR-5).
 * 1. Estimate the backdrop as the most common colour around the image border.
 * 2. Drop opaque pixels close to the backdrop (if that drops everything, the garment matches the backdrop — keep all).
 * 3. Weight the rest towards the centre and return the mean of the heaviest 3-bit-per-channel bin.
 */
export function extractDominantColor(pixels: Uint8ClampedArray, width: number, height: number): string {
  const border = new Map<number, Bin>();
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (x >= BORDER && y >= BORDER && x < width - BORDER && y < height - BORDER) continue;
      const i = (y * width + x) * 4;
      if (pixels[i + 3] < 128) continue;
      addTo(border, pixels[i], pixels[i + 1], pixels[i + 2], 1);
    }
  }
  const backdrop = heaviest(border);

  const cx = (width - 1) / 2;
  const cy = (height - 1) / 2;
  const maxDist = Math.hypot(cx, cy) || 1;
  const garment = new Map<number, Bin>();
  const everything = new Map<number, Bin>();

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      if (pixels[i + 3] < 128) continue;
      const r = pixels[i];
      const g = pixels[i + 1];
      const b = pixels[i + 2];
      const w = 1 + 2 * (1 - Math.hypot(x - cx, y - cy) / maxDist);
      addTo(everything, r, g, b, w);
      if (!backdrop || colorDistance({ r, g, b }, backdrop) > BACKGROUND_THRESHOLD) addTo(garment, r, g, b, w);
    }
  }

  const winner = heaviest(garment) ?? heaviest(everything);
  return winner ? rgbToHex(winner) : FALLBACK;
}

/** Target size that fits inside `max` on the longest side, never upscaling. */
export function fitWithin(width: number, height: number, max: number): { width: number; height: number } {
  const scale = Math.min(1, max / Math.max(width, height));
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}
