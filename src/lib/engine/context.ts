import { CATEGORIES, PATTERNS, type Occasion } from '../domain/catalog';
import { lookId } from '../domain/naming';
import type { Item, WearEntry } from '../domain/types';
import { featuresOf } from './features';
import type { RuleResult } from './types';

export interface WeatherInput {
  maxC: number;
  precipitationChance: number;
}

export const HOT_FROM_C = 26;
export const COLD_TO_C = 12;
export const RAIN_FROM = 50;
export const REPEAT_WINDOW_DAYS = 14;
export const ITEM_REST_DAYS = 2;

const empty = (): RuleResult => ({ score: 0, notes: [], rejections: [] });

/** FR-13. `score` is a signed adjustment. */
export function weatherAdjustment(top: Item, bottom: Item, weather: WeatherInput | null | undefined): RuleResult {
  const out = empty();
  if (!weather) return out;
  const temp = Math.round(weather.maxC);
  for (const item of [top, bottom]) {
    const { warmth, phrase } = featuresOf(item);
    if (weather.maxC >= HOT_FROM_C) {
      if (warmth === 'warm') {
        out.score -= 20;
        out.notes.push({ tone: 'minus', text: `Warm for a ${phrase} today (${temp}°).` });
      } else if (warmth === 'light') out.score += 5;
    } else if (weather.maxC <= COLD_TO_C) {
      if (warmth === 'light') {
        out.score -= 15;
        out.notes.push({ tone: 'minus', text: `Chilly for a ${phrase} today (${temp}°).` });
      } else if (warmth === 'warm') {
        out.score += 8;
        out.notes.push({ tone: 'plus', text: `The ${phrase} suits a ${temp}° day.` });
      }
    }
  }
  if (weather.precipitationChance >= RAIN_FROM && featuresOf(bottom).hsl.l > 0.8) {
    out.score -= 10;
    out.notes.push({ tone: 'minus', text: 'Rain is likely, and light hems show splashes.' });
  }
  return out;
}

/** Whole days from `from` to `to`, both `YYYY-MM-DD`. */
export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

const AGO = (n: number) => (n === 0 ? 'today' : n === 1 ? 'yesterday' : `${n} days ago`);

/** Days since each piece / exact pair was last worn, built once per engine run. */
export interface WearIndex {
  item: Map<string, number>;
  pair: Map<string, number>;
}

export function buildWearIndex(wearLog: WearEntry[] | undefined, today: string): WearIndex {
  const index: WearIndex = { item: new Map(), pair: new Map() };
  const keepMin = (map: Map<string, number>, key: string, ago: number) => {
    if (!map.has(key) || ago < map.get(key)!) map.set(key, ago);
  };
  for (const entry of wearLog ?? []) {
    const ago = daysBetween(entry.date, today);
    if (ago < 0) continue;
    if (entry.topId) keepMin(index.item, entry.topId, ago);
    if (entry.bottomId) keepMin(index.item, entry.bottomId, ago);
    if (entry.topId && entry.bottomId) keepMin(index.pair, lookId(entry.topId, entry.bottomId), ago);
  }
  return index;
}

/** FR-14: rejects an exact pair worn recently; penalises pieces worn in the last couple of days. */
export function recencyAdjustment(top: Item, bottom: Item, index: WearIndex): RuleResult {
  const out = empty();
  const pairAgo = index.pair.get(lookId(top.id, bottom.id));
  if (pairAgo !== undefined && pairAgo <= REPEAT_WINDOW_DAYS) {
    out.rejections.push({ code: 'recent', text: `You wore this exact look ${AGO(pairAgo)}.` });
  }
  for (const item of [top, bottom]) {
    const ago = index.item.get(item.id);
    if (ago !== undefined && ago <= ITEM_REST_DAYS) {
      out.score -= 12;
      out.notes.push({ tone: 'minus', text: `You wore the ${item.name.toLowerCase()} ${AGO(ago)}.` });
    }
  }
  return out;
}

/** FR-12 hard rules beyond formality, all driven by the occasion's data. */
export function occasionRules(top: Item, bottom: Item, occasion: Occasion): RuleResult {
  const out = empty();
  const where = occasion.label.toLowerCase();
  for (const item of [top, bottom]) {
    if (occasion.bannedCategories.includes(item.category)) {
      out.rejections.push({ code: 'occasion-category', text: `${CATEGORIES[item.category].label} aren't right for ${where}.` });
    }
    if (occasion.bannedPatterns.includes(item.pattern)) {
      out.rejections.push({ code: 'occasion-pattern', text: `${PATTERNS[item.pattern].label} prints read too casual for ${where}.` });
    }
  }
  if (occasion.noAllWhite && featuresOf(top).whiteish && featuresOf(bottom).whiteish) {
    out.rejections.push({ code: 'all-white', text: 'An all-white look competes with the couple.' });
  }
  return out;
}
