import { describe, expect, it, vi } from 'vitest';
import { countiesForState, countyToCoord, loadCountyData, parseCounties } from '../../assets/js/counties.js';

const SAMPLE = `
The counties in Arizona are: Maricopa, Pima, and Yavapai.
The counties in Texas are: Harris County, Travis County, and Bexar County.
`;

describe('parseCounties', () => {
  it('parses state sections and normalizes county suffixes', () => {
    const states = parseCounties(SAMPLE);
    expect(states).toHaveLength(2);
    expect(states[0].state).toBe('Arizona');
    expect(states[0].counties).toEqual(['Maricopa County', 'Pima County', 'Yavapai County']);
    expect(states[1].counties).toEqual(['Harris County', 'Travis County', 'Bexar County']);
  });
});

describe('countyToCoord', () => {
  it('returns deterministic bounded coordinates', () => {
    const coord = countyToCoord('Arizona', 'Maricopa County');
    expect(coord.lat).toBeGreaterThanOrEqual(-72);
    expect(coord.lat).toBeLessThanOrEqual(72);
    expect(coord.lon).toBeGreaterThanOrEqual(-179);
    expect(coord.lon).toBeLessThanOrEqual(179);
  });
});

describe('loadCountyData / countiesForState', () => {
  it('loads county data and supports per-state lookups', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      text: () => Promise.resolve(SAMPLE),
    });
    vi.stubGlobal('fetch', fetchMock);

    const data = await loadCountyData('/data/all-us-counties.txt');

    expect(fetchMock).toHaveBeenCalledWith('/data/all-us-counties.txt');
    expect(data.stateNames).toContain('Arizona');
    expect(countiesForState(data, 'Arizona')).toEqual(['Maricopa County', 'Pima County', 'Yavapai County']);
    expect(data.pointCloud.length).toBeGreaterThan(0);
    expect(data.stateCoverage[0]).toEqual({ state: 'Arizona', count: 3 });

    vi.unstubAllGlobals();
  });
});
