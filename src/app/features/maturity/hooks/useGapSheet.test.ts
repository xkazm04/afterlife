// A preview that resolves after the Send sheet closed is dropped, so the reopened sheet asks again instead of confirming it.
import { describe, expect, it } from 'vitest';
import type { WriteView } from '@/server/actions/words';
import type { SheetRow } from '../write/sheet';
import { createAsker } from './useGapSheet';

const row = { id: 'g1' } as SheetRow;
const view = (id: string): WriteView => ({ kind: 'refused', reason: id });

function setup() {
  const pending: Array<(v: WriteView) => void> = [];
  const got: Array<[string, WriteView]> = [];
  const asker = createAsker(
    () => new Promise<WriteView>((res) => pending.push(res)),
    (id, v) => got.push([id, v]),
  );
  return { pending, got, asker };
}
const tick = () => new Promise((r) => setTimeout(r, 0));

describe('createAsker', () => {
  it('hands on an answer that lands while the sheet is open', async () => {
    const { pending, got, asker } = setup();
    asker.ask(row);
    pending[0]?.(view('a'));
    await tick();
    expect(got).toEqual([['g1', view('a')]]);
  });
  it('drops an answer that lands after the sheet closed', async () => {
    const { pending, got, asker } = setup();
    asker.ask(row);
    asker.close();
    pending[0]?.(view('old'));
    await tick();
    expect(got).toEqual([]);
  });
  it('keeps the answer to a fresh ask after a close and reopen, and drops the old one', async () => {
    const { pending, got, asker } = setup();
    asker.ask(row);
    asker.close();
    asker.ask(row);
    pending[1]?.(view('new'));
    pending[0]?.(view('old'));
    await tick();
    expect(got).toEqual([['g1', view('new')]]);
  });
});
