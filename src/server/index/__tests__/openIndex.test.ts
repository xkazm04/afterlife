import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { indexDir, openIndex } from '../db';
import { upsertGroups, listGroups } from '../repositories';

describe('the persistent index', () => {
  it('is created (with its parent folders) on first start and survives a restart', async () => {
    const base = fs.mkdtempSync(path.join(os.tmpdir(), 'belay-index-'));
    const dataDir = path.join(base, 'not', 'yet', 'there'); // BELAY_DATA_DIR that does not exist
    try {
      const first = await openIndex({ dataDir });
      await upsertGroups(first, ['core-banking']);
      await first.close();
      expect(fs.existsSync(indexDir(dataDir))).toBe(true);
      const second = await openIndex({ dataDir });
      expect(await listGroups(second)).toEqual(['core-banking']);
      await second.close();
    } finally {
      fs.rmSync(base, { recursive: true, force: true });
    }
  });
});
