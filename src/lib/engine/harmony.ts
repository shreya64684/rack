import { hueDistance } from '../color/color';
import { capitalize as cap } from '../domain/naming';
import type { Item } from '../domain/types';
import { featuresOf } from './features';
import type { RuleResult } from './types';

export type HarmonyKind = 'neutral' | 'tonal' | 'analogous' | 'complementary' | 'triadic' | 'discordant';

export interface Harmony extends RuleResult {
  kind: HarmonyKind;
}

const works = (kind: HarmonyKind, score: number, text: string): Harmony => ({
  kind,
  score,
  notes: [{ tone: 'plus', text }],
  rejections: [],
});
const caution = (kind: HarmonyKind, score: number, text: string): Harmony => ({
  kind,
  score,
  notes: [{ tone: 'minus', text }],
  rejections: [],
});

/** FR-9. Discordant pairs (score < 40) are rejected. */
export function colorHarmony(top: Item, bottom: Item): Harmony {
  const a = featuresOf(top);
  const b = featuresOf(bottom);
  const an = a.colorName.toLowerCase();
  const bn = b.colorName.toLowerCase();

  if (a.neutral && b.neutral) return works('neutral', 82, `${cap(an)} and ${bn} are both neutrals, so nothing fights.`);
  if (a.neutral || b.neutral) {
    const [quiet, loud] = a.neutral ? [an, bn] : [bn, an];
    return works('neutral', 88, `${cap(quiet)} lets the ${loud} do the talking.`);
  }

  const d = hueDistance(a.hsl.h, b.hsl.h);
  if (d <= 15) {
    return Math.abs(a.hsl.l - b.hsl.l) >= 0.15
      ? works('tonal', 86, `Tonal dressing: ${an} over ${bn}, light against dark.`)
      : caution('tonal', 66, `${cap(an)} on ${bn} is very close in depth, so it reads as a matched set.`);
  }
  if (d <= 45) return works('analogous', 80, `${cap(an)} and ${bn} sit next to each other on the colour wheel.`);
  if (d >= 150) {
    return a.vivid && b.vivid
      ? caution('complementary', 62, `${cap(an)} against ${bn} is a loud, deliberate contrast.`)
      : works('complementary', 78, `${cap(an)} and ${bn} are opposites that balance each other.`);
  }
  if (d >= 105 && d <= 135) return caution('triadic', 60, `${cap(an)} with ${bn} is a playful triadic mix.`);

  const text = `${cap(an)} and ${bn} sit at an awkward distance on the colour wheel.`;
  return { kind: 'discordant', score: 30, notes: [], rejections: [{ code: 'color', text }] };
}
