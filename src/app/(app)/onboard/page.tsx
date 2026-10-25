import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { connection } from 'next/server';
import type { ClaudeRepo } from '@/schemas/vitals';
import { notLocal } from '@/server/actions/local';
import { listClaudeRepos } from '@/server/discover';
import { messageOf } from '@/lib/format/error';
import { WizardScreen } from '@/app/features/onboard/wizard/WizardScreen';

export const metadata: Metadata = { title: 'Belay Onboard' };

// Onboard: a real project in one click. "Your repos" is read on the server at request time, and only for a request
// addressed to this machine: the list names local paths, and the hosted replay has no Claude Code history to show. The
// proposal, the probes and the save run from the client through /api/onboard/*. The demo estate is /onboard/estate.
export default async function OnboardPage() {
  await connection(); // request time: the repos are this machine's now, never the build's
  let repos: ClaudeRepo[] = [];
  let note: string | undefined;
  if (notLocal(await headers())) note = 'Onboarding runs on your own machine: open Afterlife on localhost to list your repos and propose.';
  else {
    try {
      repos = await listClaudeRepos();
    } catch (e) {
      note = `Your Claude Code repos could not be listed: ${messageOf(e, { firstLine: true })}. Paste a path instead.`;
    }
  }
  return <WizardScreen repos={repos} note={note} />;
}
