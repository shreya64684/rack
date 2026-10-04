import { FORMALITY_LABELS, type Occasion } from '../domain/catalog';
import type { Item } from '../domain/types';
import type { RuleResult } from './types';

const outside = (f: number, [lo, hi]: [number, number]) => (f < lo ? lo - f : f > hi ? f - hi : 0);

/** FR-11 */
export function formalityMatch(top: Item, bottom: Item, occasion: Occasion): RuleResult {
  const out: RuleResult = { score: 0, notes: [], rejections: [] };
  const gap = Math.abs(top.formality - bottom.formality);
  const where = occasion.label.toLowerCase();

  if (gap >= 3) {
    out.rejections.push({
      code: 'formality-gap',
      text: `${FORMALITY_LABELS[top.formality]} on top and ${FORMALITY_LABELS[bottom.formality].toLowerCase()} below pull in two directions.`,
    });
  } else if (gap === 0) {
    out.notes.push({
      tone: 'plus',
      text: `Both pieces are ${FORMALITY_LABELS[top.formality].toLowerCase()}, so the look is consistent.`,
    });
  }

  let misses = 0;
  for (const item of [top, bottom]) {
    const off = outside(item.formality, occasion.range);
    if (off > 1) {
      const way = item.formality < occasion.range[0] ? 'casual' : 'dressy';
      out.rejections.push({ code: 'occasion-formality', text: `${item.name} is too ${way} for ${where}.` });
    }
    misses += off;
  }
  if (misses === 1) out.notes.push({ tone: 'minus', text: `Slightly off the usual dress code for ${where}.` });

  out.score = Math.max(0, 100 - gap * 15 - misses * 20);
  return out;
}
