import { PGlite } from '@electric-sql/pglite';
import { beforeAll, describe, expect, it } from 'vitest';
import { memoryIndex } from '../index/__tests__/memoryIndex';
import { closeAll, track } from './closeDbs';

const opened: PGlite[] = [];
let shared: PGlite;

beforeAll(async () => {
  shared = await memoryIndex();
});

describe('closeDbs', () => {
  it('opens two databases, and the registry closes both', async () => {
    opened.push(await memoryIndex(), track(new PGlite()));
    await closeAll();
    for (const db of opened) expect(db.closed).toBe(true);
  });

  it('tolerates a test that closed its own database', async () => {
    const own = track(new PGlite());
    await own.close();
    await expect(closeAll()).resolves.toBeUndefined();
  });

  it('closed the previous tests databases after they ended', () => {
    expect(opened.every((db) => db.closed)).toBe(true);
  });

  it('keeps a beforeAll database alive between tests', async () => {
    expect(shared.closed).toBe(false);
    await expect(shared.query('select 1 as n')).resolves.toBeTruthy();
  });
});
