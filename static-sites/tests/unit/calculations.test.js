import { describe, expect, it } from 'vitest';
import { calculateGhostLoss, calculateRoi, formatUsd } from '../../assets/js/calculations.js';

describe('calculateRoi', () => {
  it('computes baseline, rescued leads, projected revenue, and lift', () => {
    const result = calculateRoi({
      monthlyLeads: 120,
      showRate: 58,
      closeRate: 31,
      avgValue: 790,
      delayLoss: 35,
    });

    expect(result.legacyRevenue).toBeCloseTo(17050.44, 2);
    expect(result.rescued).toBeCloseTo(26.04, 2);
    expect(result.projectedRevenue).toBeCloseTo(23425.02, 2);
    expect(result.lift).toBeCloseTo(6374.58, 2);
  });
});

describe('calculateGhostLoss', () => {
  it('computes monthly leak and missed inquiries', () => {
    const result = calculateGhostLoss({
      leads: 120,
      response: 44,
      avgValue: 790,
    });

    expect(result.legacyCapture).toBeCloseTo(0.56, 2);
    expect(result.missed).toBe(42);
    expect(result.monthlyLoss).toBe(33180);
  });

  it('enforces minimum capture floor for high response score', () => {
    const result = calculateGhostLoss({
      leads: 100,
      response: 99,
      avgValue: 500,
    });

    expect(result.legacyCapture).toBe(0.08);
    expect(result.missed).toBe(5);
  });
});

describe('formatUsd', () => {
  it('formats numeric values to dollar strings', () => {
    expect(formatUsd(12345.6)).toBe('$12,346');
    expect(formatUsd(0)).toBe('$0');
  });
});
