import countiesRaw from '../../all-us-counties.txt?raw';

export interface StateCountyMap {
  state: string;
  counties: string[];
}

const sectionPattern = /The\s+(.+?)\s+in\s+([A-Za-z\s'.-]+)\s+are:\s+([\s\S]*?)(?:\.\s*\n|\.$)/g;

const normalizeCounty = (value: string): string =>
  value
    .replace(/\band\b/gi, ',')
    .split(',')
    .map((token) => token.trim())
    .filter(Boolean)
    .map((county) => {
      if (county.includes('County') || county.includes('Borough') || county.includes('Parish')) {
        return county;
      }
      if (county.includes('City') || county.includes('Census Area') || county.includes('Planning Region')) {
        return county;
      }
      return `${county} County`;
    })
    .join('|');

const map: StateCountyMap[] = [];
let match = sectionPattern.exec(countiesRaw);
while (match) {
  const state = match[2].trim();
  const countyBlob = normalizeCounty(match[3]);
  const counties = countyBlob
    .split('|')
    .map((item) => item.trim())
    .filter(Boolean);

  map.push({ state, counties });
  match = sectionPattern.exec(countiesRaw);
}

export const US_COUNTY_DATA = map;
export const US_STATES = US_COUNTY_DATA.map((entry) => entry.state).sort((a, b) => a.localeCompare(b));

export function countiesForState(state: string): string[] {
  return US_COUNTY_DATA.find((entry) => entry.state === state)?.counties ?? [];
}

export function isCountyKnown(state: string, county: string): boolean {
  const list = countiesForState(state);
  return list.includes(county);
}
