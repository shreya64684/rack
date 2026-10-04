import { PATTERNS } from '../domain/catalog';
import type { Item } from '../domain/types';
import type { RuleResult } from './types';

const label = (item: Item) => PATTERNS[item.pattern].label.toLowerCase();
const clash = (text: string): RuleResult => ({ score: 0, notes: [], rejections: [{ code: 'pattern', text }] });

/** FR-10 */
export function patternMatch(top: Item, bottom: Item): RuleResult {
  const a = top.pattern;
  const b = bottom.pattern;

  if (a === 'solid' && b === 'solid') {
    return { score: 80, notes: [{ tone: 'plus', text: 'Two solids keep the lines clean.' }], rejections: [] };
  }
  if (a === 'solid' || b === 'solid') {
    const patterned = a === 'solid' ? bottom : top;
    return { score: 92, notes: [{ tone: 'plus', text: `One pattern (${label(patterned)}), anchored by a solid.` }], rejections: [] };
  }
  if (a === b) return clash(`Two ${label(top)} pieces compete for attention.`);
  if (a === 'graphic' || b === 'graphic') return clash('A graphic print needs a plain partner.');
  if (PATTERNS[a].busy && PATTERNS[b].busy) return clash(`${PATTERNS[a].label} with ${label(bottom)} is too busy.`);
  return {
    score: 55,
    notes: [
      {
        tone: 'minus',
        text: `Stripes with ${label(a === 'stripes' ? bottom : top)} is a bold mix; it works best when the scales differ.`,
      },
    ],
    rejections: [],
  };
}
