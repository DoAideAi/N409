import { describe, expect, it } from 'vitest';
import { discountExhibit } from '../../src/domain/reportExhibits.js';
import { discountChart, footedDiscountLadder } from '../../src/domain/reportSummary.js';

/**
 * The DLOC → DLOM ladder on the summary chart and in Exhibit H printed every
 * line rounded on its own, so the column did not add up: $21.4888 − $1.1862 −
 * $6.5578 is $13.7448, under a $13.7449 conclusion. Each discount is now the
 * difference of the two printed subtotals beside it.
 */
const money = (s: string) => Number(s.replace(/[^0-9.]/g, ''));
const CASE = { fmv_per_share: 13.7449, discounts: { dloc: 0.0552, dlom: 0.323 } };

function sweep(): Array<{ fmv: number; dloc: number; dlom: number }> {
  const out = [];
  let seed = 7;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
  for (let i = 0; i < 2000; i++) {
    out.push({
      fmv: Math.round((0.01 + rnd() * 50) * 10000) / 10000,
      dloc: Math.round(rnd() * 3000) / 10000,
      dlom: Math.round(rnd() * 4500) / 10000,
    });
  }
  return out;
}

describe('the discount ladder foots to the conclusion', () => {
  it('on the reported case', () => {
    const chart = discountChart(CASE as never, 'USD')!;
    expect(chart.start.display).toBe('$21.4888');
    expect(chart.steps.map((s) => s.display)).toEqual(['−$1.1861', '−$6.5578']);
    expect(chart.end_display).toBe('$13.7449');
  });

  it('on the summary chart, for every ladder in a sweep', () => {
    for (const { fmv, dloc, dlom } of sweep()) {
      const chart = discountChart({ fmv_per_share: fmv, discounts: { dloc, dlom } } as never, 'USD')!;
      const total = chart.steps.reduce((acc, s) => acc - money(s.display), money(chart.start.display));
      expect(total).toBeCloseTo(money(chart.end_display), 8);
      const values = chart.steps.reduce((acc, s) => acc + s.value, chart.start.value);
      expect(values).toBeCloseTo(chart.end_value, 8);
    }
  });

  it('in Exhibit H, whose rows are opening, DLOC, subtotal, DLOM and the foot', () => {
    for (const { fmv, dloc, dlom } of sweep().slice(0, 300)) {
      const section = discountExhibit({ fmv_per_share: fmv, discounts: { dloc, dlom } }, {
        currency: 'USD',
        companyName: 'Acme',
      })!;
      const figures = [...section.html.matchAll(/\(?\$[0-9,]+\.\d{4}\)?/g)].map((m) => m[0]);
      const [opening, lessDloc, subtotal, lessDlom, concluded] = figures.slice(0, 5).map(money);
      expect(opening! - lessDloc!).toBeCloseTo(subtotal!, 8);
      expect(subtotal! - lessDlom!).toBeCloseTo(concluded!, 8);
    }
  });

  it('moves no line by more than the rounding it already had', () => {
    const base = 13.7449 / ((1 - 0.0552) * (1 - 0.323));
    const ladder = footedDiscountLadder(base, 0.0552, 13.7449);
    expect(Math.abs(ladder.dlocAmount - base * 0.0552)).toBeLessThanOrEqual(0.0001);
    expect(Math.abs(ladder.dlomAmount - base * (1 - 0.0552) * 0.323)).toBeLessThanOrEqual(0.0001);
  });
});
