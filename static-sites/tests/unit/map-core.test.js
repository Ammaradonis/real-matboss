import { describe, expect, it } from 'vitest';
import { clusterBounds, limitPointCloud, scoreByState } from '../../assets/js/map-core.js';

describe('scoreByState', () => {
  it('builds state/count lookup map', () => {
    const map = scoreByState([
      { state: 'Arizona', count: 15 },
      { state: 'Texas', count: 22 },
    ]);
    expect(map.get('Arizona')).toBe(15);
    expect(map.get('Texas')).toBe(22);
  });
});

describe('limitPointCloud', () => {
  it('caps points to requested limit', () => {
    const input = Array.from({ length: 20 }, (_, i) => ({ id: i }));
    expect(limitPointCloud(input, 5)).toHaveLength(5);
    expect(limitPointCloud(input, 0)).toHaveLength(0);
  });
});

describe('clusterBounds', () => {
  it('computes min/max lat lon', () => {
    const bounds = clusterBounds([
      { lat: 10, lon: -100 },
      { lat: 45, lon: -70 },
      { lat: 20, lon: -120 },
    ]);
    expect(bounds).toEqual({
      minLat: 10,
      maxLat: 45,
      minLon: -120,
      maxLon: -70,
    });
  });

  it('returns zero bounds for empty input', () => {
    expect(clusterBounds([])).toEqual({
      minLat: 0,
      maxLat: 0,
      minLon: 0,
      maxLon: 0,
    });
  });
});
