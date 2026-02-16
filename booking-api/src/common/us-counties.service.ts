import { Injectable } from '@nestjs/common';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

@Injectable()
export class UsCountiesService {
  private readonly source = readFileSync(
    join(process.cwd(), '..', 'all-us-counties.txt'),
    'utf8',
  );

  isCountyKnown(county: string): boolean {
    return this.source.toLowerCase().includes(county.trim().toLowerCase());
  }
}
