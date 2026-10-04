import { describe, expect, it } from 'vitest';
import { findGaps } from '@/lib/engine';
import { C, item } from '../fixtures';

describe('gap finder (FR-19)', () => {
  it('AC-17: with 3 patterned tops and no bottoms, recommends a bottom that pairs with all 3', () => {
    const tops = [
      item('blouse', C.pink, { pattern: 'floral', formality: 3 }),
      item('tee', C.red, { pattern: 'stripes', formality: 2 }),
      item('shirt', C.teal, { pattern: 'checks', formality: 3 }),
    ];
    const [best] = findGaps(tops);
    expect(best.kind).toBe('bottom');
    expect(best.unlocks).toBe(3);
    expect(best.pairsWith.sort()).toEqual(tops.map((t) => t.id).sort());
  });

  it('AC-17: never recommends a duplicate of something already owned', () => {
    const tops = [item('shirt', C.navy, { formality: 3 })];
    const owned = item('trousers', '#171717', { formality: 4 });
    const gaps = findGaps([...tops, owned], 50);
    expect(gaps.some((g) => g.category === 'trousers' && g.color === C.black)).toBe(false);
  });

  it('returns at most one suggestion per category, best first', () => {
    const items = [item('shirt', C.navy, { formality: 3 }), item('tee', C.white), item('jeans', C.denim)];
    const gaps = findGaps(items, 10);
    expect(new Set(gaps.map((g) => g.category)).size).toBe(gaps.length);
    for (let i = 1; i < gaps.length; i++) expect(gaps[i - 1].unlocks).toBeGreaterThanOrEqual(gaps[i].unlocks);
    expect(findGaps(items)).toHaveLength(3);
  });

  it('returns nothing for an empty closet', () => {
    expect(findGaps([])).toEqual([]);
  });

  it('NFR-1: a 50 + 50 closet completes in under 500 ms', () => {
    const palette = [C.navy, C.grey, C.white, C.rust, C.pink, C.teal, C.camel, C.black, C.red, C.cobalt];
    const items = Array.from({ length: 100 }, (_, i) =>
      item(i < 50 ? (['shirt', 'tee', 'blouse', 'sweater', 'polo'] as const)[i % 5] : (['jeans', 'trousers', 'chinos', 'skirt'] as const)[i % 4], palette[i % 10]),
    );
    const start = performance.now();
    findGaps(items);
    expect(performance.now() - start).toBeLessThan(500);
  });
});
