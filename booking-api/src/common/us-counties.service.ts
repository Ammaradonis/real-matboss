import { Injectable, Logger } from '@nestjs/common';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

type CountyCatalog = {
  all: Set<string>;
  byState: Map<string, Set<string>>;
};

const STATE_ABBREVIATIONS: Record<string, string> = {
  AL: 'alabama',
  AK: 'alaska',
  AZ: 'arizona',
  AR: 'arkansas',
  CA: 'california',
  CO: 'colorado',
  CT: 'connecticut',
  DE: 'delaware',
  FL: 'florida',
  GA: 'georgia',
  HI: 'hawaii',
  ID: 'idaho',
  IL: 'illinois',
  IN: 'indiana',
  IA: 'iowa',
  KS: 'kansas',
  KY: 'kentucky',
  LA: 'louisiana',
  ME: 'maine',
  MD: 'maryland',
  MA: 'massachusetts',
  MI: 'michigan',
  MN: 'minnesota',
  MS: 'mississippi',
  MO: 'missouri',
  MT: 'montana',
  NE: 'nebraska',
  NV: 'nevada',
  NH: 'new hampshire',
  NJ: 'new jersey',
  NM: 'new mexico',
  NY: 'new york',
  NC: 'north carolina',
  ND: 'north dakota',
  OH: 'ohio',
  OK: 'oklahoma',
  OR: 'oregon',
  PA: 'pennsylvania',
  RI: 'rhode island',
  SC: 'south carolina',
  SD: 'south dakota',
  TN: 'tennessee',
  TX: 'texas',
  UT: 'utah',
  VT: 'vermont',
  VA: 'virginia',
  WA: 'washington',
  WV: 'west virginia',
  WI: 'wisconsin',
  WY: 'wyoming',
  DC: 'district of columbia',
};

@Injectable()
export class UsCountiesService {
  private readonly logger = new Logger(UsCountiesService.name);
  private readonly source: string;
  private readonly catalog: CountyCatalog;

  constructor() {
    const candidates = [
      join(process.cwd(), 'all-us-counties.txt'),
      join(process.cwd(), '..', 'all-us-counties.txt'),
      join(__dirname, '..', '..', 'all-us-counties.txt'),
      join(__dirname, '..', '..', '..', 'all-us-counties.txt'),
    ];

    let data = '';
    for (const candidate of candidates) {
      if (existsSync(candidate)) {
        data = readFileSync(candidate, 'utf8');
        this.logger.log(`Loaded counties from ${candidate}`);
        break;
      }
    }

    if (!data) {
      this.logger.warn(
        'all-us-counties.txt not found; county validation will accept all values',
      );
    }

    this.source = data;
    this.catalog = this.parseSource(data);
  }

  isCountyKnown(county: string): boolean {
    if (!this.source) return true;
    const normalizedCounty = this.normalizeCountyName(county);
    return this.catalog.all.has(normalizedCounty);
  }

  isCountyKnownInState(county: string, state: string): boolean {
    if (!this.source) return true;
    const normalizedState = this.normalizeStateName(state);
    if (!normalizedState) {
      return false;
    }

    const knownForState = this.catalog.byState.get(normalizedState);
    if (!knownForState) {
      return false;
    }

    return knownForState.has(this.normalizeCountyName(county));
  }

  private parseSource(source: string): CountyCatalog {
    const byState = new Map<string, Set<string>>();
    const all = new Set<string>();

    if (!source) {
      return { all, byState };
    }

    const sectionPattern =
      /The\s+.+?\s+in\s+([A-Za-z.\s'-]+)\s+are:\s*([\s\S]*?)(?=\n\s*\*{5,}\s*\n|$)/gi;

    for (const match of source.matchAll(sectionPattern)) {
      const state = this.normalizeStateName(match[1]);
      if (!state) {
        continue;
      }

      const countiesRaw = match[2].replace(/\s+/g, ' ');
      const entries = countiesRaw
        .split(',')
        .map((entry) => this.normalizeCountyName(entry))
        .filter((entry) => entry.length > 0);

      if (!entries.length) {
        continue;
      }

      const stateSet = byState.get(state) ?? new Set<string>();
      for (const entry of entries) {
        stateSet.add(entry);
        all.add(entry);
      }
      byState.set(state, stateSet);
    }

    return { all, byState };
  }

  private normalizeStateName(value: string): string | null {
    const compact = value.trim().toLowerCase().replace(/\.$/, '');
    if (!compact) {
      return null;
    }

    const abbreviation = compact.toUpperCase();
    if (STATE_ABBREVIATIONS[abbreviation]) {
      return STATE_ABBREVIATIONS[abbreviation];
    }

    return compact;
  }

  private normalizeCountyName(value: string): string {
    return value
      .trim()
      .toLowerCase()
      .replace(/\.$/, '')
      .replace(/\s+/g, ' ')
      .replace(
        /\b(county|counties|parish|parishes|borough|boroughs|census area|census areas|planning region|planning regions|independent city|independent cities|county equivalents|county equivalent)\b/g,
        '',
      )
      .replace(/\s+/g, ' ')
      .trim();
  }
}
