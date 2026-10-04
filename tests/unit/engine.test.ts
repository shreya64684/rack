import { describe, expect, it } from 'vitest';
import { commonRejection, evaluatePair, generateOutfits } from '@/lib/engine';
import { daysBetween } from '@/lib/engine/context';
import { colorHarmony } from '@/lib/engine/harmony';
import { formalityMatch } from '@/lib/engine/formality';
import { patternMatch } from '@/lib/engine/patterns';
import { occasionById } from '@/lib/domain/catalog';
import { C, item, worn } from '../fixtures';

const TODAY = '2026-10-04';

describe('colour harmony (FR-9)', () => {
  it('AC-6: navy top with grey bottom is a neutral pairing and accepted', () => {
    const h = colorHarmony(item('shirt', C.navy), item('trousers', C.grey));
    expect(h.kind).toBe('neutral');
    expect(evaluatePair(item('shirt', C.navy), item('trousers', C.grey), { occasion: 'office' }).ok).toBe(true);
  });

  it('AC-6: saturated orange with saturated green (~80° apart) is discordant and rejected', () => {
    const top = item('tee', C.orange);
    const bottom = item('shorts', C.green);
    expect(colorHarmony(top, bottom).kind).toBe('discordant');
    const e = evaluatePair(top, bottom, { occasion: 'everyday' });
    expect(e.ok).toBe(false);
    expect(e.rejections.map((r) => r.code)).toContain('color');
  });

  it('AC-7: any blue jeans count as neutral, even saturated ones', () => {
    const h = colorHarmony(item('tee', C.orange), item('jeans', C.cobalt));
    expect(h.kind).toBe('neutral');
    // The same cobalt as chinos is not neutral.
    expect(colorHarmony(item('tee', C.orange), item('chinos', C.cobalt)).kind).not.toBe('neutral');
  });

  it('treats camel and cream as neutrals', () => {
    expect(colorHarmony(item('tee', C.red), item('trousers', C.camel)).kind).toBe('neutral');
    expect(colorHarmony(item('tee', C.red), item('trousers', C.cream)).kind).toBe('neutral');
  });

  it('classifies tonal, analogous, complementary and triadic', () => {
    expect(colorHarmony(item('tee', '#c62828'), item('skirt', '#5e1010')).kind).toBe('tonal');
    expect(colorHarmony(item('tee', '#c62828'), item('skirt', '#c42a2a')).score).toBeLessThan(70); // flat match
    expect(colorHarmony(item('tee', C.pink), item('skirt', C.rust)).kind).toBe('analogous');
    expect(colorHarmony(item('tee', C.rust), item('skirt', C.teal)).kind).toBe('complementary');
    expect(colorHarmony(item('tee', '#e83030'), item('skirt', '#2fd8d8')).score).toBeLessThan(
      colorHarmony(item('tee', C.rust), item('skirt', C.teal)).score,
    ); // two vivid complements are loud
    expect(colorHarmony(item('tee', '#d03030'), item('skirt', '#3030d0')).kind).toBe('triadic');
  });

  it('marks risky-but-allowed harmonies as warnings, not positives', () => {
    const loud = colorHarmony(item('tee', '#e83030'), item('skirt', '#2fd8d8'));
    expect(loud.rejections).toHaveLength(0);
    expect(loud.notes[0].tone).toBe('minus');
    expect(colorHarmony(item('tee', '#d03030'), item('skirt', '#3030d0')).notes[0].tone).toBe('minus');
    expect(colorHarmony(item('shirt', C.navy), item('trousers', C.grey)).notes[0].tone).toBe('plus');
  });

  it('EC-11: hues wrap around the wheel (350° and 10° are close)', () => {
    const h = colorHarmony(item('tee', '#d9265a'), item('skirt', '#d94a26'));
    expect(['tonal', 'analogous']).toContain(h.kind);
  });
});

describe('pattern rules (FR-10)', () => {
  it('AC-8: floral with checks is rejected', () => {
    expect(patternMatch(item('blouse', C.pink, { pattern: 'floral' }), item('trousers', C.grey, { pattern: 'checks' })).rejections).toHaveLength(1);
  });
  it('AC-8: stripes with stripes is rejected', () => {
    expect(patternMatch(item('tee', C.white, { pattern: 'stripes' }), item('skirt', C.navy, { pattern: 'stripes' })).rejections).toHaveLength(1);
  });
  it('AC-8: stripes with floral is allowed with a penalty', () => {
    const r = patternMatch(item('tee', C.white, { pattern: 'stripes' }), item('skirt', C.navy, { pattern: 'floral' }));
    expect(r.rejections).toHaveLength(0);
    expect(r.score).toBeLessThan(patternMatch(item('tee', C.white), item('skirt', C.navy)).score);
  });
  it('AC-8: a solid with anything carries no penalty', () => {
    for (const p of ['stripes', 'checks', 'floral', 'print', 'graphic'] as const) {
      const r = patternMatch(item('tee', C.white), item('skirt', C.navy, { pattern: p }));
      expect(r.rejections).toHaveLength(0);
      expect(r.score).toBeGreaterThanOrEqual(80);
    }
  });
  it('graphic with any non-solid is rejected', () => {
    expect(patternMatch(item('tee', C.white, { pattern: 'graphic' }), item('skirt', C.navy, { pattern: 'stripes' })).rejections).toHaveLength(1);
  });
});

describe('formality and occasions (FR-11, FR-12)', () => {
  it('AC-9: a lounge hoodie with formal trousers is rejected', () => {
    const e = evaluatePair(item('hoodie', C.grey, { formality: 1 }), item('trousers', C.black, { formality: 5 }), {
      occasion: 'everyday',
    });
    expect(e.ok).toBe(false);
    expect(e.rejections.map((r) => r.code)).toContain('formality-gap');
  });

  it('AC-9: at the office a tee is rejected but a shirt with trousers is accepted', () => {
    const trousers = item('trousers', C.grey, { formality: 4 });
    expect(evaluatePair(item('tee', C.navy, { formality: 1 }), trousers, { occasion: 'office' }).ok).toBe(false);
    expect(evaluatePair(item('shirt', C.navy, { formality: 3 }), trousers, { occasion: 'office' }).ok).toBe(true);
  });

  it('one level outside the range is allowed, with a note', () => {
    const r = formalityMatch(item('polo', C.navy, { formality: 2 }), item('chinos', C.camel, { formality: 3 }), occasionById('office'));
    expect(r.rejections).toHaveLength(0);
    expect(r.notes).toContainEqual({ tone: 'minus', text: expect.stringMatching(/slightly/i) });
  });

  it('closer formality scores higher', () => {
    const occ = occasionById('everyday');
    const same = formalityMatch(item('tee', C.navy, { formality: 2 }), item('jeans', C.denim, { formality: 2 }), occ);
    const apart = formalityMatch(item('tee', C.navy, { formality: 1 }), item('jeans', C.denim, { formality: 3 }), occ);
    expect(same.score).toBeGreaterThan(apart.score);
  });

  it('AC-10: an all-white wedding guest look is rejected, mentioning white', () => {
    const e = evaluatePair(item('blouse', C.white, { formality: 4 }), item('trousers', C.cream, { formality: 4 }), {
      occasion: 'wedding',
    });
    expect(e.ok).toBe(false);
    expect(e.rejections.find((r) => r.code === 'all-white')?.text).toMatch(/white/i);
  });

  it('AC-10: shorts are rejected at the office', () => {
    const e = evaluatePair(item('shirt', C.navy, { formality: 3 }), item('shorts', C.camel, { formality: 3 }), {
      occasion: 'office',
    });
    expect(e.rejections.map((r) => r.code)).toContain('occasion-category');
  });

  it('graphic prints are rejected at a wedding; joggers on a date', () => {
    expect(
      evaluatePair(item('tee', C.black, { pattern: 'graphic', formality: 4 }), item('trousers', C.black, { formality: 4 }), {
        occasion: 'wedding',
      }).rejections.map((r) => r.code),
    ).toContain('occasion-pattern');
    expect(
      evaluatePair(item('shirt', C.navy, { formality: 3 }), item('joggers', C.grey, { formality: 3 }), { occasion: 'date' }).ok,
    ).toBe(false);
  });
});

describe('weather (FR-13)', () => {
  const bottom = item('jeans', C.denim);
  it('AC-11: on a 30° day a sweater scores below a tee', () => {
    const ctx = { occasion: 'everyday' as const, weather: { maxC: 30, precipitationChance: 0 } };
    const sweater = evaluatePair(item('sweater', C.navy, { formality: 2 }), bottom, ctx);
    const tee = evaluatePair(item('tee', C.navy, { formality: 2 }), bottom, ctx);
    expect(sweater.score).toBeLessThan(tee.score);
    expect(sweater.notes.some((n) => n.tone === 'minus' && /30°/.test(n.text))).toBe(true);
  });

  it('AC-11: on an 8° day a tank scores below a sweater', () => {
    const ctx = { occasion: 'everyday' as const, weather: { maxC: 8, precipitationChance: 0 } };
    const tank = evaluatePair(item('tank', C.navy, { formality: 2 }), bottom, ctx);
    const sweater = evaluatePair(item('sweater', C.navy, { formality: 2 }), bottom, ctx);
    expect(tank.score).toBeLessThan(sweater.score);
  });

  it('AC-12: at 70% rain a cream bottom scores below a navy one', () => {
    const ctx = { occasion: 'office' as const, weather: { maxC: 20, precipitationChance: 70 } };
    const top = item('shirt', C.rust, { formality: 3 });
    const cream = evaluatePair(top, item('trousers', C.cream, { formality: 4 }), ctx);
    const navy = evaluatePair(top, item('trousers', C.navy, { formality: 4 }), ctx);
    expect(cream.score).toBeLessThan(navy.score);
    expect(cream.notes.map((n) => n.text).join(' ')).toMatch(/rain/i);
  });

  it('mild weather changes nothing', () => {
    const top = item('sweater', C.navy, { formality: 2 });
    const withWeather = evaluatePair(top, bottom, { occasion: 'everyday', weather: { maxC: 18, precipitationChance: 10 } });
    const without = evaluatePair(top, bottom, { occasion: 'everyday' });
    expect(withWeather.score).toBe(without.score);
  });
});

describe('wear history (FR-14)', () => {
  const top = item('shirt', C.navy, { formality: 3 });
  const bottom = item('chinos', C.camel, { formality: 3 });

  it('AC-13: a pair worn 5 days ago is excluded', () => {
    const e = evaluatePair(top, bottom, { occasion: 'everyday', today: TODAY, wearLog: [worn(top, bottom, '2026-09-29')] });
    expect(e.ok).toBe(false);
    expect(e.rejections[0].code).toBe('recent');
  });

  it('AC-13: a pair worn 20 days ago is included', () => {
    expect(
      evaluatePair(top, bottom, { occasion: 'everyday', today: TODAY, wearLog: [worn(top, bottom, '2026-09-14')] }).ok,
    ).toBe(true);
  });

  it('AC-13: the top alone worn yesterday is included with a penalty and a reason', () => {
    const other = item('jeans', C.denim);
    const base = evaluatePair(top, bottom, { occasion: 'everyday', today: TODAY });
    const e = evaluatePair(top, bottom, { occasion: 'everyday', today: TODAY, wearLog: [worn(top, other, '2026-10-03')] });
    expect(e.ok).toBe(true);
    expect(e.score).toBeLessThan(base.score);
    expect(e.notes.some((n) => /yesterday/.test(n.text))).toBe(true);
  });

  it('ignores future-dated entries and deleted items', () => {
    const future = worn(top, bottom, '2026-10-10');
    const orphan = { ...worn(top, bottom, '2026-10-03'), topId: null, bottomId: null };
    expect(evaluatePair(top, bottom, { occasion: 'everyday', today: TODAY, wearLog: [future, orphan] }).ok).toBe(true);
  });

  it('counts whole days', () => {
    expect(daysBetween('2026-09-30', '2026-10-04')).toBe(4);
  });
});

describe('generateOutfits (FR-8)', () => {
  it('AC-5: 2 compatible tops × 2 bottoms gives 4 outfits, best first, each explained', () => {
    const tops = [item('shirt', C.navy, { formality: 3 }), item('tee', C.white, { formality: 2 })];
    const bottoms = [item('chinos', C.camel, { formality: 3 }), item('jeans', C.denim, { formality: 2 })];
    const looks = generateOutfits(tops, bottoms, { occasion: 'everyday' });
    expect(looks).toHaveLength(4);
    for (let i = 1; i < looks.length; i++) expect(looks[i - 1].score).toBeGreaterThanOrEqual(looks[i].score);
    for (const l of looks) expect(l.notes.length).toBeGreaterThan(0);
  });

  it('is deterministic for ties', () => {
    const tops = [item('tee', C.white, { id: 'b' }), item('tee', C.white, { id: 'a' })];
    const bottoms = [item('jeans', C.denim, { id: 'z' })];
    expect(generateOutfits(tops, bottoms, { occasion: 'everyday' }).map((l) => l.id)).toEqual(['a__z', 'b__z']);
  });

  it('EC-8: explains the most common rejection when nothing works', () => {
    const tops = [item('tee', C.navy, { formality: 1 }), item('hoodie', C.grey, { formality: 1 })];
    const bottoms = [item('joggers', C.black, { formality: 1 })];
    expect(generateOutfits(tops, bottoms, { occasion: 'wedding' })).toHaveLength(0);
    expect(commonRejection(tops, bottoms, { occasion: 'wedding' })?.code).toBe('occasion-formality');
    expect(commonRejection([], [], { occasion: 'wedding' })).toBeNull();
  });

  it('AC-19 / NFR-1: 100 × 100 pairs score in under 200 ms', () => {
    const hues = Array.from({ length: 100 }, (_, i) => i * 3.6);
    const hex = (h: number) => {
      const f = (n: number) => {
        const k = (n + h / 30) % 12;
        const v = 0.5 - 0.4 * Math.max(-1, Math.min(k - 3, 9 - k, 1));
        return Math.round(v * 255).toString(16).padStart(2, '0');
      };
      return `#${f(0)}${f(8)}${f(4)}`;
    };
    const tops = hues.map((h, i) => item('shirt', hex(h), { formality: 3, id: `t${i}` }));
    const bottoms = hues.map((h, i) => item('trousers', hex((h + 40) % 360), { formality: 3, id: `b${i}` }));
    const log = tops.slice(0, 30).map((t, i) => worn(t, bottoms[i], '2026-10-01'));
    generateOutfits(tops.slice(0, 5), bottoms.slice(0, 5), { occasion: 'office' }); // warm caches
    const start = performance.now();
    generateOutfits(tops, bottoms, { occasion: 'office', today: TODAY, wearLog: log, weather: { maxC: 28, precipitationChance: 60 } });
    expect(performance.now() - start).toBeLessThan(200);
  });
});
