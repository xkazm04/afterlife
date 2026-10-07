// Verify: is the arm change on the target's default branch? Read only, through the port: one file read, nothing written.
// It says what it found; the screen marks a track armed (or disarmed) only on what this read saw.
import { GitLabError } from '@/server/gitlab/errors';
import { ActionRefused } from '../plans/context';
import type { ArmTrack, DisarmTrack } from '../types';
import type { ActionDeps } from '../run';
import { findBlock } from './block';
import { CI_FILE, targetOf, trackArm } from './plan';

/** What a verify answers. `armed` is what the read saw on the default branch; `text` says it in words. */
export type ArmCheck =
  | { status: 'read'; armed: boolean; text: string }
  | { status: 'simulated'; text: string }
  | { status: 'refused'; reason: string };

export const SIMULATED_VERIFY = 'Simulated · demo mode: Belay read nothing from GitLab';

export async function checkArm(deps: Pick<ActionDeps, 'port' | 'groupId' | 'gitlabId'>, intent: ArmTrack | DisarmTrack): Promise<ArmCheck> {
  try {
    const a = trackArm(intent.track);
    const t = await targetOf(deps.port, deps.groupId, deps.gitlabId, intent.project);
    const where = `${CI_FILE} on ${t.base} of ${t.project.pathWithNamespace}`;
    const file = await deps.port.getFile(t.project.id, CI_FILE, t.base);
    if (!file) return { status: 'read', armed: false, text: `there is no ${where}` };
    const found = findBlock(file.content, a);
    if (found.state === 'armed') return { status: 'read', armed: true, text: `${a.track}'s arm block is in ${where} (line ${found.from + 1})` };
    if (found.state === 'edited') return { status: 'read', armed: false, text: `${where} has a ${a.track} block that was edited after it was added (line ${found.from + 1})` };
    return { status: 'read', armed: false, text: `${where} has no ${a.track} arm block` };
  } catch (e) {
    if (e instanceof ActionRefused) return { status: 'refused', reason: e.message };
    if (e instanceof GitLabError) return { status: 'refused', reason: `GitLab said no while reading: ${e.message}` };
    throw e;
  }
}
