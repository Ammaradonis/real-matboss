import { UsCountiesService } from './us-counties.service';

describe('UsCountiesService', () => {
  const service = new UsCountiesService();

  it('recognizes known counties', () => {
    expect(service.isCountyKnown('Los Angeles County')).toBe(true);
    expect(service.isCountyKnown('Cook County')).toBe(true);
    expect(service.isCountyKnown('Autauga')).toBe(true);
  });

  it('rejects unknown county values', () => {
    expect(service.isCountyKnown('Unknown County of Atlantis')).toBe(false);
  });

  it('validates county and state pairings', () => {
    expect(service.isCountyKnownInState('Los Angeles County', 'CA')).toBe(true);
    expect(service.isCountyKnownInState('Los Angeles County', 'California')).toBe(true);
    expect(service.isCountyKnownInState('Los Angeles County', 'TX')).toBe(false);
  });
});
