import { describe, expect, it } from 'vitest';
import { approachExhibit } from '../../src/domain/reportExhibits.js';
import { approachChart, weightingChart } from '../../src/domain/reportSummary.js';

/**
 * Exhibit B struck every weight to a whole percent, so a 12.5 / 37.5 / 50
 * weighting printed 13% / 38% / 50% over a 100% foot, and no reader could
 * reproduce a weighted indication from the weight printed beside it. A weight
 * is printed at the precision it was applied at, as the discount rates are.
 */
const plain = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

describe('Exhibit B prints approach weights as applied', () => {
  const results = {
    equity_value: 10_000_000,
    approaches: {
      market: { weight: 0.5, equity_value: 10_400_000 },
      income: { weight: 0.375, equity_value: 9_600_000 },
      asset: { weight: 0.125, equity_value: 9_600_000 },
    },
  };

  it('states fractional weights exactly and the foot as their sum', () => {
    const section = approachExhibit(results, { currency: 'USD', companyName: 'Acme' })!;
    const seen = plain(section.html);
    expect(seen).toContain('37.5%');
    expect(seen).toContain('12.5%');
    expect(seen).not.toContain('38%');
    expect(seen).not.toContain('13%');
    expect(seen).toMatch(/100%/);
  });

  it('keeps a whole weight whole', () => {
    const seen = plain(approachExhibit(results, { currency: 'USD', companyName: 'Acme' })!.html);
    expect(seen).toMatch(/\b50%/);
    expect(seen).not.toContain('50.0%');
  });
});

describe('the summary charts print approach weights as applied', () => {
  const results = {
    equity_value: 10_000_000,
    approaches: {
      market: { weight: 0.5, equity_value: 10_400_000 },
      income: { weight: 0.375, equity_value: 9_600_000 },
      asset: { weight: 0.125, equity_value: 9_600_000 },
    },
  };

  it('on the weighting donut', () => {
    const donut = weightingChart(results as never)!;
    const displays = 'slices' in donut ? donut.slices.map((s) => s.display) : [];
    expect(displays).toEqual(expect.arrayContaining(['50%', '37.5%', '12.5%']));
  });

  it('on the approach bar labels', () => {
    const bars = approachChart(results as never, 'USD')!;
    const labels = 'points' in bars ? bars.points.map((p) => p.label).join(' ') : '';
    expect(labels).toContain('37.5%');
    expect(labels).toContain('12.5%');
  });
});
