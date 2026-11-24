import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const dir = join(__dirname, '../../src/logic');
const banned = [/from\s+['"]three['"]/, /\bdocument\b/, /\bwindow\b/, /Math\.random/, /Date\.now/, /localStorage/];

describe('logic purity', () => {
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.ts'))) {
    it(`${f} has no impure references`, () => {
      const src = readFileSync(join(dir, f), 'utf8');
      for (const re of banned) expect(re.test(src), `${f} matches ${re}`).toBe(false);
    });
  }
});
