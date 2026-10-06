// pairing: where Belay is paired. setup_step: what each setup step measured (by Belay's probes, never an agent's say-so).
import { asDate, toIso, upsertRows, type Queryable, type TableSpec } from './sql';

export interface PairingRow {
  id: string;
  gitlabHost: string;
  groupPath: string;
  /** Absolute path, verified with git rev-parse. */
  checkoutPath: string | null;
  pairedAt: Date | null;
}

export type SetupWho = 'agent' | 'human';
export type SetupState = 'done' | 'running' | 'needs_you' | 'waiting' | 'unknown' | 'failed';

export interface SetupStepRow {
  pairingId: string;
  /** 0..14, the skill's numbers. */
  step: number;
  who: SetupWho;
  state: SetupState;
  probe: Record<string, unknown> | null;
  probedAt: Date | null;
}

const PAIRING: TableSpec = {
  table: 'pairing',
  key: ['id'],
  cols: { id: 'text', gitlab_host: 'text', group_path: 'text', checkout_path: 'text', paired_at: 'timestamptz' },
};
const STEP: TableSpec = {
  table: 'setup_step',
  key: ['pairing_id', 'step'],
  cols: { pairing_id: 'text', step: 'int', who: 'text', state: 'text', probe: 'jsonb', probed_at: 'timestamptz' },
};

export const upsertPairing = (db: Queryable, p: PairingRow): Promise<void> =>
  upsertRows(db, PAIRING, [{ id: p.id, gitlab_host: p.gitlabHost, group_path: p.groupPath, checkout_path: p.checkoutPath, paired_at: toIso(p.pairedAt) }]);

export async function getPairing(db: Queryable, id: string): Promise<PairingRow | null> {
  const { rows } = await db.query<{ id: string; gitlab_host: string; group_path: string; checkout_path: string | null; paired_at: Date | null }>(
    'select * from pairing where id = $1',
    [id],
  );
  const r = rows[0];
  return r ? { id: r.id, gitlabHost: r.gitlab_host, groupPath: r.group_path, checkoutPath: r.checkout_path, pairedAt: asDate(r.paired_at) } : null;
}

export const upsertSetupSteps = (db: Queryable, rows: readonly SetupStepRow[]): Promise<void> =>
  upsertRows(db, STEP, rows.map((s) => ({
    pairing_id: s.pairingId, step: s.step, who: s.who, state: s.state, probe: s.probe, probed_at: toIso(s.probedAt),
  })));

export async function listSetupSteps(db: Queryable, pairingId: string): Promise<SetupStepRow[]> {
  const { rows } = await db.query<{
    pairing_id: string; step: number; who: SetupWho; state: SetupState; probe: Record<string, unknown> | null; probed_at: Date | null;
  }>('select * from setup_step where pairing_id = $1 order by step', [pairingId]);
  return rows.map((r) => ({
    pairingId: r.pairing_id, step: r.step, who: r.who, state: r.state, probe: r.probe, probedAt: asDate(r.probed_at),
  }));
}
