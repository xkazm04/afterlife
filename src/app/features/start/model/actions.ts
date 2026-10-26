// The setup catalogue's words on screen, and what the assistant is told each turn. Pure. The commands themselves are
// never spelled here: they are the server's preview (previewAction), shown before anything runs.
import type { SetupAction, StartSnapshot } from '@/server/start/wire';
import type { StartFacts } from './types';
import type { StepView } from './view';

const TITLE: Record<SetupAction['kind'], string> = {
  'install-glab': 'Install glab',
  'glab-login': 'Sign in to GitLab',
  'set-setup': 'Set the group, live',
  'save-project': 'Save the project',
};

/** "Set the group, live" — the action's title, as Run it, the chat's card and the sheet say it. */
export function actionTitle(a: SetupAction): string {
  return a.kind === 'set-setup' ? `${a.mode === 'live' ? 'Watch' : 'Demo on'} group ${a.groupId}${a.mode === 'live' ? ', live' : ''}` : TITLE[a.kind];
}

/** The wizard as the assistant reads it: every step's state and line, and the values in play. */
export function snapshotOf(steps: readonly StepView[], f: StartFacts, v: { repo?: string; host?: string; groupId?: string | null }): StartSnapshot {
  return {
    steps: steps.map((s) => ({ key: s.key, state: s.state, line: s.line })),
    ...(v.repo ? { repo: v.repo } : {}),
    host: v.host ?? f.host,
    groupId: v.groupId ?? f.groupId,
    mode: f.mode,
    platform: f.platform,
  };
}
