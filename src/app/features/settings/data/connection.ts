// What Data & connection shows of the server's environment, as four plain strings: the screen stream's `connection`
// slice (screen/slices.ts). Read on the server at request time; never a token (none is read anywhere).
import { readDataConfig } from '@/server/data/config';
import { readConfig } from '@/server/gitlab/config';

export interface ConnectionRead {
  mode: string;
  gitlab: string;
  host: string;
  groupId: string;
}

export function readConnection(env: Record<string, string | undefined> = process.env): ConnectionRead {
  const data = readDataConfig(env);
  const gl = readConfig(env);
  const live = data.mode === 'live';
  const fake = live && data.gitlab === 'fake';
  // Any value but `live` serves the demo (the hosted replay sets `replay`); only an unset variable is "the default".
  const set = env.BELAY_MODE;
  return {
    mode: live ? 'live (BELAY_MODE=live)' : set ? `demo (BELAY_MODE=${set} is not live)` : 'demo (the default)',
    gitlab: !live ? 'not used in demo' : fake ? 'seeded fake, not a real group' : 'real, through the glab login',
    host: !live || fake ? 'none' : (gl.host ?? 'gitlab.com'),
    groupId: !live || fake ? 'none' : gl.groupId,
  };
}
