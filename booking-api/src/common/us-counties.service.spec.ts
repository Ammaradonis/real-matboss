import { UsCountiesService } from './us-counties.service';

describe('UsCountiesService', () => {
  const service = new UsCountiesService();

  it('recognizes known counties', () => {
    expect(service.isCountyKnown('Los Angeles County')).toBe(true);
    expect(service.isCountyKnown('Cook County')).toBe(true);
  });

  it('rejects unknown county values', () => {
    expect(service.isCountyKnown('Unknown County of Atlantis')).toBe(false);
  });
});
