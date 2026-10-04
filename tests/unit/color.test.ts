import { describe, expect, it } from 'vitest';
import {
  contrastRatio,
  hexToHsl,
  hexToRgb,
  hueDistance,
  isHex,
  nameColor,
  rgbToHex,
} from '@/lib/color/color';
import { extractDominantColor, fitWithin } from '@/lib/color/extract';
import { autoName, cleanName } from '@/lib/domain/naming';

type Px = [number, number, number, number];

/** Paint a w×h RGBA buffer: background everywhere, `fg` inside the centred rectangle. */
function image(w: number, h: number, bg: Px, fg?: { color: Px; inset: number }): Uint8ClampedArray {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const inside = fg && x >= fg.inset && y >= fg.inset && x < w - fg.inset && y < h - fg.inset;
      data.set(inside ? fg.color : bg, (y * w + x) * 4);
    }
  }
  return data;
}

describe('colour maths', () => {
  it('round-trips hex and rgb', () => {
    expect(rgbToHex(hexToRgb('#1d2242'))).toBe('#1d2242');
    expect(rgbToHex({ r: 300, g: -4, b: 12.6 })).toBe('#ff000d');
    expect(isHex('#abcdef')).toBe(true);
    expect(isHex('blue')).toBe(false);
    expect(() => hexToRgb('nope')).toThrow();
  });

  it('converts to hsl', () => {
    expect(hexToHsl('#ff0000')).toEqual({ h: 0, s: 1, l: 0.5 });
    expect(hexToHsl('#808080').s).toBe(0);
    expect(Math.round(hexToHsl('#00ff00').h)).toBe(120);
    expect(Math.round(hexToHsl('#0000ff').h)).toBe(240);
  });

  it('EC-11: hue distance wraps around 360°', () => {
    expect(hueDistance(350, 10)).toBe(20);
    expect(hueDistance(10, 350)).toBe(20);
    expect(hueDistance(0, 180)).toBe(180);
  });

  it('names colours in wardrobe words', () => {
    expect(nameColor('#1e2a46')).toBe('Navy');
    expect(nameColor('#ffffff')).toBe('White');
    expect(nameColor('#b38556')).toBe('Camel');
  });

  it('NFR-3: the design tokens meet WCAG AA contrast', () => {
    expect(contrastRatio('#1d2242', '#eceee8')).toBeGreaterThanOrEqual(4.5); // ink on calico
    expect(contrastRatio('#565b75', '#eceee8')).toBeGreaterThanOrEqual(4.5); // muted on calico
    expect(contrastRatio('#1d2242', '#f2b8c6')).toBeGreaterThanOrEqual(4.5); // ink on chalk
    expect(contrastRatio('#9a3350', '#eceee8')).toBeGreaterThanOrEqual(4.5); // alert on calico
    expect(contrastRatio('#777c74', '#eceee8')).toBeGreaterThanOrEqual(3); // control borders
  });
});

describe('dominant colour extraction (FR-2)', () => {
  it('AC-1: a red tee on a white background reads as red, not white', () => {
    const px = image(64, 64, [250, 250, 250, 255], { color: [200, 30, 40, 255], inset: 18 });
    const { h } = hexToHsl(extractDominantColor(px, 64, 64));
    expect(h <= 20 || h >= 340).toBe(true);
  });

  it('ignores a coloured backdrop and picks the centred garment', () => {
    const px = image(48, 60, [120, 160, 200, 255], { color: [40, 40, 40, 255], inset: 16 });
    expect(extractDominantColor(px, 48, 60)).toBe('#282828');
  });

  it('EC-1: a flat single-colour photo returns that colour', () => {
    const px = image(20, 20, [31, 42, 68, 255]);
    expect(extractDominantColor(px, 20, 20)).toBe('#1f2a44');
  });

  it('EC-1: a fully transparent image returns mid-grey', () => {
    expect(extractDominantColor(image(10, 10, [0, 0, 0, 0]), 10, 10)).toBe('#808080');
  });

  it('AC-1: a 3000×4000 photo is stored at 900×1200; small photos are never upscaled', () => {
    expect(fitWithin(3000, 4000, 1200)).toEqual({ width: 900, height: 1200 });
    expect(fitWithin(4000, 3000, 1200)).toEqual({ width: 1200, height: 900 });
    expect(fitWithin(640, 480, 1200)).toEqual({ width: 640, height: 480 });
  });
});

describe('item naming (FR-4)', () => {
  it('AC-2: a navy shirt without a name is called "Navy shirt"', () => {
    expect(autoName('#1f2a44', 'shirt')).toBe('Navy shirt');
    expect(cleanName('   ', '#1f2a44', 'shirt')).toBe('Navy shirt');
  });

  it('keeps and tidies a given name, capped at 60 characters', () => {
    expect(cleanName('  Mum’s   linen shirt ', '#ffffff', 'shirt')).toBe('Mum’s linen shirt');
    expect(cleanName('x'.repeat(80), '#ffffff', 'shirt')).toHaveLength(60);
  });
});
