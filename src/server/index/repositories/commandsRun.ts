// commands_run: one row for every write the operator confirmed, recorded BEFORE it runs so a crash leaves a trace.
import { asDate, type Queryable } from './sql';

export interface CommandInput {
  at: Date;
  /** The operator's GitLab user. */
  operator: string;
  projectId?: string;
  proposalId?: string;
  /** The exact command text the operator saw before clicking. */
  display: string;
  argv: readonly string[];
  risk?: string;
}

export type CommandOutcome = 'confirmed' | 'ok' | 'failed';

export interface CommandRow extends Omit<CommandInput, 'projectId' | 'proposalId' | 'risk'> {
  id: number;
  projectId: string | null;
  proposalId: string | null;
  risk: string | null;
  outcome: CommandOutcome;
  exitCode: number | null;
  finishedAt: Date | null;
}

interface Db {
  id: number; at: Date; operator: string; project_id: string | null; proposal_id: string | null; display: string;
  argv: string[]; risk: string | null; outcome: CommandOutcome; exit_code: number | null; finished_at: Date | null;
}

export async function recordCommand(db: Queryable, c: CommandInput): Promise<number> {
  const { rows } = await db.query<{ id: number }>(
    `insert into commands_run (at, operator, project_id, proposal_id, display, argv, risk)
     values ($1::timestamptz, $2, $3, $4, $5, $6::jsonb, $7) returning id`,
    [c.at.toISOString(), c.operator, c.projectId ?? null, c.proposalId ?? null, c.display, JSON.stringify(c.argv), c.risk ?? null],
  );
  return (rows[0] as { id: number }).id;
}

/** Marks a confirmed command finished. Only a command still 'confirmed' can be finished. */
export async function finishCommand(db: Queryable, id: number, exitCode: number, at: Date): Promise<boolean> {
  const { rows } = await db.query<{ id: number }>(
    `update commands_run set outcome = $2, exit_code = $3, finished_at = $4::timestamptz
     where id = $1 and outcome = 'confirmed' returning id`,
    [id, exitCode === 0 ? 'ok' : 'failed', exitCode, at.toISOString()],
  );
  return rows.length === 1;
}

export async function listCommands(db: Queryable, projectId?: string): Promise<CommandRow[]> {
  const { rows } =
    projectId === undefined
      ? await db.query<Db>('select * from commands_run order by id')
      : await db.query<Db>('select * from commands_run where project_id = $1 order by id', [projectId]);
  return rows.map((r) => ({
    id: r.id, at: asDate(r.at) as Date, operator: r.operator, projectId: r.project_id, proposalId: r.proposal_id,
    display: r.display, argv: r.argv, risk: r.risk, outcome: r.outcome, exitCode: r.exit_code, finishedAt: asDate(r.finished_at),
  }));
}
