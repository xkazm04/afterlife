// /start's wire: the setup intents (run through previewAction / confirmAction), the derive and ask answers. Types only,
// shared by the server and the wizard. Contract of spark afterlife-onboard-wizard: names here are final.

/** Install glab with the platform's package manager (winget on Windows, brew on macOS). */
export interface InstallGlab {
  kind: 'install-glab';
}

/** Open a terminal window running `glab auth login [--hostname <host>]`; the person finishes it there. */
export interface GlabLogin {
  kind: 'glab-login';
  /** Omitted for gitlab.com. */
  host?: string;
}

/** Write the runtime settings and restart the live runtime in-process. */
export interface SetSetup {
  kind: 'set-setup';
  groupId: string;
  mode: 'demo' | 'live';
  host?: string;
  project?: string;
  proofAuthors?: string;
}

export type SetupIntent = InstallGlab | GlabLogin | SetSetup;
export const SETUP_KINDS = ['install-glab', 'glab-login', 'set-setup'] as const;

/** What the assistant may propose: a setup intent, or the wizard's own save (POST /api/start/save). */
export type SetupAction = SetupIntent | { kind: 'save-project' };

/** POST /api/start/derive {root}: what the repo's git remote says about where it lives. */
export interface DeriveAnswer {
  host: string;
  /** The remote's namespace ("acme/platform"); null when the remote is not on GitLab. */
  groupPath: string | null;
  /** The namespace's numeric id, read with glab; null when it could not be read (reason says why). */
  groupId: string | null;
  /** The project's full path ("acme/platform/api"); null when the remote is not on GitLab. */
  projectPath: string | null;
  reason?: string;
}

export interface AskTurn {
  role: 'you' | 'afterlife';
  text: string;
}

/** What the wizard tells the assistant each turn: the steps as the screen shows them, and the values in play. */
export interface StartSnapshot {
  steps: { key: string; state: string; line: string }[];
  repo?: string;
  host: string;
  groupId: string;
  mode: 'demo' | 'live';
  platform: 'windows' | 'macos' | 'linux';
}

/** POST /api/start/ask {turns, state}. `action` only ever holds a SetupAction the server validated. */
export interface AskAnswer {
  reply: string;
  action?: SetupAction;
  ms: number;
}
