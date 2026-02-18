import { describe, expect, it } from 'vitest';
import { latLonToCartesian, nextRotation } from '../../assets/js/globe-core.js';

describe('latLonToCartesian', () => {
  it('maps lat/lon to stable xyz coordinates on a sphere', () => {
    const point = latLonToCartesian(0, 0, 2.25);
    expect(point.x).toBeCloseTo(2.25, 2);
    expect(point.y).toBeCloseTo(0, 2);
    expect(point.z).toBeCloseTo(0, 2);
  });
});

describe('nextRotation', () => {
  it('increments rotation with speed', () => {
    expect(nextRotation(1, 0.01)).toBeCloseTo(1.01, 6);
    expect(nextRotation(0)).toBeCloseTo(0.0022, 6);
  });
});
