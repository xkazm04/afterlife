import { describe, expect, it } from 'vitest';
import { loadTasks } from '../build/loadTasks';
import { REPLAY_START, checkShown, ledgerRowAt, nextReplay, replayDone, replayMessage, replayStartStatus, replayStepStatus } from './replay';

const task = loadTasks()[0]!;

describe('replay sequence', () => {
  it('starts with the claims only, then lands one check per tick, then ends', () => {
    const seen: (number | null)[] = [REPLAY_START];
    let rv: number | null = REPLAY_START;
    while (rv !== null) {
      rv = nextReplay(rv, 5);
      seen.push(rv);
    }
    expect(seen).toEqual([-1, 1, 2, 3, 4, null]);
  });

  it('shows everything when not replaying', () => {
    expect(checkShown(null, 3)).toBe(true);
    expect(replayDone(null, 5)).toBe(true);
  });

  it('shows only the landed checks during a replay', () => {
    expect(checkShown(-1, 0)).toBe(false);
    expect(checkShown(2, 1)).toBe(true);
    expect(checkShown(2, 2)).toBe(false);
    expect(replayDone(4, 5)).toBe(false);
    expect(replayDone(5, 5)).toBe(true);
  });

  it('maps progress onto the ledger rows without leaving the table', () => {
    expect(ledgerRowAt(0, 5, 7)).toBe(0);
    expect(ledgerRowAt(5, 5, 7)).toBe(6);
    expect(ledgerRowAt(99, 5, 7)).toBe(6);
    expect(ledgerRowAt(3, 5, 0)).toBe(0);
    const rows = [1, 2, 3, 4].map((rv) => ledgerRowAt(rv, 5, 7));
    expect(rows).toEqual([...rows].sort((a, b) => a - b));
  });

  it('words the messages from the ledger, and says the agent is not re-run', () => {
    expect(replayMessage(task)).toBe('Replayed ledger #476–#482 · 7 rows, hashes match · PASS · agent not re-run');
    expect(replayStartStatus(task)).toBe('ledger #476 · claims as the agent wrote them');
    expect(replayStepStatus(task, 0)).toMatch(/^ledger #476 · task_started · hash [0-9a-f]{7} ✓$/);
    expect(replayStepStatus(task, 99)).toBe('');
  });
});
