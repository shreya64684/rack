import { hexToHsl, hexToRgb, rgbToHex } from '../color/color';
import type { Category, Pattern } from '../domain/types';

/**
 * Technical flats — the line drawings designers put in tech packs — drawn as SVG
 * so the sample wardrobe looks like a real closet without shipping stock photos.
 */

const shade = (hex: string, f: number) => {
  const { r, g, b } = hexToRgb(hex);
  return f < 0
    ? rgbToHex({ r: r * (1 + f), g: g * (1 + f), b: b * (1 + f) })
    : rgbToHex({ r: r + (255 - r) * f, g: g + (255 - g) * f, b: b + (255 - b) * f });
};

const LONG_SLEEVE =
  'M145 60 L105 72 L62 140 L44 382 L84 388 L112 205 L115 420 L285 420 L288 205 L316 388 L356 382 L338 140 L295 72 L255 60 Q200 96 145 60 Z';

const SHAPES: Record<Category, { body: string; details: string }> = {
  tee: {
    body: 'M145 60 L110 72 L52 122 L82 172 L117 150 L117 420 L283 420 L283 150 L318 172 L348 122 L290 72 L255 60 Q200 100 145 60 Z',
    details: '<path d="M145 60 Q200 112 255 60"/><path d="M117 150 L117 170 M283 150 L283 170" />',
  },
  tank: {
    body: 'M152 50 L152 112 Q130 150 126 186 L126 420 L274 420 L274 186 Q270 150 248 112 L248 50 L232 50 Q200 120 168 50 Z',
    details: '<path d="M168 50 Q200 128 232 50"/>',
  },
  shirt: {
    body: LONG_SLEEVE,
    details:
      '<path d="M145 60 L172 112 L200 92 L228 112 L255 60"/><path d="M200 92 L200 420"/><g class="btn"><circle cx="208" cy="140" r="3.5"/><circle cx="208" cy="200" r="3.5"/><circle cx="208" cy="260" r="3.5"/><circle cx="208" cy="320" r="3.5"/><circle cx="208" cy="380" r="3.5"/></g><path d="M240 150 h28 v30 h-28 z"/>',
  },
  blouse: {
    body: 'M145 60 L108 74 L66 160 L104 192 L122 150 L118 420 L282 420 L278 150 L296 192 L334 160 L292 74 L255 60 L200 132 Z',
    details: '<path d="M145 60 L200 132 L255 60"/><path d="M118 300 Q200 318 282 300"/>',
  },
  polo: {
    body: 'M145 60 L110 72 L52 122 L82 172 L117 150 L117 420 L283 420 L283 150 L318 172 L348 122 L290 72 L255 60 Q200 96 145 60 Z',
    details:
      '<path d="M145 60 L176 104 L200 90 L224 104 L255 60"/><path d="M190 90 L190 160 L210 160 L210 90"/><g class="btn"><circle cx="200" cy="118" r="3.5"/><circle cx="200" cy="145" r="3.5"/></g>',
  },
  sweater: {
    body: LONG_SLEEVE,
    details:
      '<path d="M145 60 Q200 112 255 60"/><path d="M115 396 L285 396"/><path d="M48 352 L88 358 M352 352 L312 358"/>',
  },
  hoodie: {
    body: LONG_SLEEVE,
    details:
      '<path d="M145 60 Q150 6 200 6 Q250 6 255 60 Q200 120 145 60"/><path d="M188 98 L184 150 M212 98 L216 150"/><path d="M140 300 L260 300 L280 380 L120 380 Z"/><path d="M115 400 L285 400"/>',
  },
  kurta: {
    body: 'M150 56 L110 70 L66 140 L48 300 L86 306 L112 200 L108 462 L292 462 L288 200 L314 306 L352 300 L334 140 L290 70 L250 56 Q200 70 150 56 Z',
    details:
      '<path d="M176 60 L176 50 Q200 46 224 50 L224 60"/><path d="M200 66 L200 190"/><g class="btn"><circle cx="207" cy="92" r="3"/><circle cx="207" cy="122" r="3"/><circle cx="207" cy="152" r="3"/></g><path d="M108 380 L122 462 M292 380 L278 462"/>',
  },
  jeans: {
    body: 'M128 40 L272 40 L292 452 L216 452 L200 150 L184 452 L108 452 Z',
    details:
      '<path d="M128 62 L272 62"/><path d="M132 62 Q150 110 196 104 M268 62 Q250 110 204 104"/><path d="M200 62 L200 140" class="stitch"/><path d="M112 430 L188 430 M212 430 L288 430" class="stitch"/>',
  },
  trousers: {
    body: 'M130 40 L270 40 L290 452 L214 452 L200 150 L186 452 L110 452 Z',
    details:
      '<path d="M130 62 L270 62"/><path d="M160 62 L150 452 M240 62 L250 452" class="stitch"/><path d="M200 62 L200 130"/><path d="M140 70 L160 120 M260 70 L240 120"/>',
  },
  chinos: {
    body: 'M130 40 L270 40 L288 452 L214 452 L200 150 L186 452 L112 452 Z',
    details:
      '<path d="M130 62 L270 62"/><path d="M134 62 L160 112 M266 62 L240 112"/><path d="M200 62 L200 136"/><path d="M114 432 L186 432 M214 432 L286 432"/>',
  },
  skirt: {
    body: 'M146 40 L254 40 L322 432 L78 432 Z',
    details: '<path d="M146 64 L254 64"/><path d="M180 64 L160 432 M220 64 L240 432" class="stitch"/>',
  },
  shorts: {
    body: 'M128 40 L272 40 L298 262 L210 274 L200 160 L190 274 L102 262 Z',
    details:
      '<path d="M128 62 L272 62"/><path d="M134 62 Q152 108 194 102 M266 62 Q248 108 206 102"/><path d="M106 240 L192 250 M208 250 L294 240" class="stitch"/>',
  },
  joggers: {
    body: 'M130 40 L270 40 L282 396 L270 452 L214 452 L210 400 L200 150 L190 400 L186 452 L130 452 L118 396 Z',
    details:
      '<path d="M130 66 L270 66"/><path d="M190 66 L186 100 M210 66 L214 100"/><path d="M120 404 L188 404 M212 404 L280 404"/>',
  },
};

function patternDef(pattern: Pattern, base: string): string {
  const { l } = hexToHsl(base);
  const ink = l > 0.6 ? '#1f2a44' : '#efe6d2';
  switch (pattern) {
    case 'stripes':
      return `<pattern id="pt" width="24" height="24" patternUnits="userSpaceOnUse"><rect width="24" height="9" fill="${ink}"/></pattern>`;
    case 'checks':
      return `<pattern id="pt" width="36" height="36" patternUnits="userSpaceOnUse"><rect width="36" height="12" fill="${ink}" opacity=".35"/><rect width="12" height="36" fill="${ink}" opacity=".35"/></pattern>`;
    case 'floral':
      return `<pattern id="pt" width="54" height="54" patternUnits="userSpaceOnUse"><g fill="${l > 0.6 ? '#c2287a' : '#efc6c0'}"><circle cx="14" cy="10" r="5"/><circle cx="22" cy="14" r="5"/><circle cx="18" cy="22" r="5"/><circle cx="9" cy="20" r="5"/></g><circle cx="16" cy="16" r="3" fill="#d4a52c"/><g fill="${l > 0.6 ? '#1f7373' : '#9caf88'}"><ellipse cx="40" cy="40" rx="7" ry="3" transform="rotate(-35 40 40)"/><ellipse cx="44" cy="30" rx="6" ry="2.5" transform="rotate(40 44 30)"/></g></pattern>`;
    case 'print':
      return `<pattern id="pt" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M20 6 L30 20 L20 34 L10 20 Z" fill="none" stroke="${ink}" stroke-width="3"/><circle cx="20" cy="20" r="3" fill="${ink}"/></pattern>`;
    default:
      return '';
  }
}

export function garmentSvg(category: Category, color: string, pattern: Pattern): string {
  const shape = SHAPES[category];
  const line = shade(color, hexToHsl(color).l > 0.35 ? -0.45 : 0.45);
  const def = patternDef(pattern, color);
  const overlay = def ? `<path d="${shape.body}" fill="url(#pt)"/>` : '';
  const graphic =
    pattern === 'graphic'
      ? `<text x="200" y="250" text-anchor="middle" font-family="Arial Black, sans-serif" font-size="46" fill="${line}">ROAM</text>`
      : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 480" width="800" height="960"><defs>${def}</defs><rect width="400" height="480" fill="#ffffff"/><g transform="translate(0 8)"><path d="${shape.body}" fill="${color}"/>${overlay}${graphic}<g fill="none" stroke="${line}" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"><path d="${shape.body}"/>${shape.details.replace(/class="btn"/g, `fill="${line}"`).replace(/class="stitch"/g, 'stroke-dasharray="5 5"')}</g></g></svg>`;
}
