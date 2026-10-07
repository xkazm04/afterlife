// Live mode's Re-probe and a step's verify: the server reads again (rereadSetupAction, read only, localhost only). A
// server that does not answer is a refusal, never a state the screen makes up.
import { rereadSetupAction } from '@/server/data/setup/rereadAction';
import type { SetupReread } from '@/server/data/setup/types';

export function reread(part: 'doctor' | 'steps'): Promise<SetupReread> {
  return rereadSetupAction(part).catch((e: unknown) => ({ status: 'refused' as const, reason: e instanceof Error ? e.message : 'the server did not answer' }));
}
