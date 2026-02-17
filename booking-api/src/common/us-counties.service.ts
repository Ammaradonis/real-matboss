import { Injectable, Logger } from '@nestjs/common';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

@Injectable()
export class UsCountiesService {
  private readonly logger = new Logger(UsCountiesService.name);
  private readonly source: string;

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
  }

  isCountyKnown(county: string): boolean {
    if (!this.source) return true;
    return this.source.toLowerCase().includes(county.trim().toLowerCase());
  }
}
