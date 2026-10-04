import { occasionById, type Occasion } from '../domain/catalog';
import { lookId } from '../domain/naming';
import type { Item, OccasionId, WearEntry } from '../domain/types';
import {
  buildWearIndex,
  occasionRules,
  recencyAdjustment,
  weatherAdjustment,
  type WearIndex,
  type WeatherInput,
} from './context';
import { formalityMatch } from './formality';
import { colorHarmony, type HarmonyKind } from './harmony';
import { patternMatch } from './patterns';
import type { Note, Rejection, RejectionCode } from './types';

const WEIGHTS = { color: 0.45, pattern: 0.25, formality: 0.3 } as const;

export interface EngineContext {
  occasion: OccasionId;
  weather?: WeatherInput | null;
  wearLog?: WearEntry[];
  /** `YYYY-MM-DD`; required for recency rules. */
  today?: string;
}

export interface Evaluation {
  ok: boolean;
  score: number;
  harmony: HarmonyKind;
  notes: Note[];
  rejections: Rejection[];
}

export interface ScoredOutfit extends Evaluation {
  id: string;
  top: Item;
  bottom: Item;
}

export interface Prepared {
  occasion: Occasion;
  weather: WeatherInput | null;
  wear: WearIndex | null;
}

export const prepare = (ctx: EngineContext): Prepared => ({
  occasion: occasionById(ctx.occasion),
  weather: ctx.weather ?? null,
  wear: ctx.today ? buildWearIndex(ctx.wearLog, ctx.today) : null,
});

export function evaluatePrepared(top: Item, bottom: Item, p: Prepared): Evaluation {
  const harmony = colorHarmony(top, bottom);
  const pattern = patternMatch(top, bottom);
  const formality = formalityMatch(top, bottom, p.occasion);
  const adjustments = [
    occasionRules(top, bottom, p.occasion),
    weatherAdjustment(top, bottom, p.weather),
    ...(p.wear ? [recencyAdjustment(top, bottom, p.wear)] : []),
  ];
  const all = [harmony, pattern, formality, ...adjustments];

  const base = harmony.score * WEIGHTS.color + pattern.score * WEIGHTS.pattern + formality.score * WEIGHTS.formality;
  const delta = adjustments.reduce((sum, a) => sum + a.score, 0);
  const rejections = all.flatMap((r) => r.rejections);
  return {
    ok: rejections.length === 0,
    score: Math.round(Math.max(0, Math.min(100, base + delta))),
    harmony: harmony.kind,
    notes: all.flatMap((r) => r.notes),
    rejections,
  };
}

/** Score one top + bottom for an occasion (FR-8 – FR-14). */
export function evaluatePair(top: Item, bottom: Item, ctx: EngineContext): Evaluation {
  return evaluatePrepared(top, bottom, prepare(ctx));
}

/** Every valid top × bottom pair, best first. Ties break on ids so results are stable. */
export function generateOutfits(tops: Item[], bottoms: Item[], ctx: EngineContext): ScoredOutfit[] {
  const p = prepare(ctx);
  const out: ScoredOutfit[] = [];
  for (const top of tops) {
    for (const bottom of bottoms) {
      const e = evaluatePrepared(top, bottom, p);
      if (e.ok) out.push({ ...e, id: lookId(top.id, bottom.id), top, bottom });
    }
  }
  return out.sort((a, b) => b.score - a.score || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

/** EC-8: when nothing passes, the most common reason so the empty state can say why. */
export function commonRejection(tops: Item[], bottoms: Item[], ctx: EngineContext): Rejection | null {
  const p = prepare(ctx);
  const counts = new Map<RejectionCode, { n: number; first: Rejection }>();
  for (const top of tops) {
    for (const bottom of bottoms) {
      for (const r of evaluatePrepared(top, bottom, p).rejections) {
        const c = counts.get(r.code);
        if (c) c.n++;
        else counts.set(r.code, { n: 1, first: r });
      }
    }
  }
  let best: { n: number; first: Rejection } | null = null;
  for (const c of counts.values()) if (!best || c.n > best.n) best = c;
  return best?.first ?? null;
}
