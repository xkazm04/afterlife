// The wizard's words for engines, durations and ages. Pure.
import type { Engine, HostKind } from '@/schemas/vitals';
import type { EngineKey } from '@/server/discover/wire';

export const ENGINES: readonly { key: EngineKey; label: string; title: string }[] = [
  { key: 'sonnet', label: 'sonnet 5.5 · low', title: 'claude-sonnet-5-5 at low effort: the default' },
  { key: 'haiku', label: 'haiku 5.5 · low', title: 'claude-haiku-5-5 at low effort: the A/B arm' },
];

/** "claude-sonnet-5-5" -> "sonnet 5.5"; anything else as it is. */
export function modelLabel(model: string): string {
  const m = /^claude-([a-z]+)-(\d+)-(\d+)$/.exec(model);
  return m ? `${m[1]} ${m[2]}.${m[3]}` : model;
}

/** The footer: "sonnet 5.5 · low · 41 s". */
export const engineLine = (e: Engine, ms: number): string => `${modelLabel(e.model)} · ${e.effort} · ${Math.max(1, Math.round(ms / 1000))} s`;

export const HOST_LABEL: Record<HostKind, string> = { 'azure-devops': 'Azure DevOps', gitlab: 'GitLab', github: 'GitHub', none: 'no remote' };

/** "4 min ago", "3 h ago", "12 d ago" from an ISO instant, against `now`. */
export function ago(iso: string, now: number): string {
  const s = Math.max(0, (now - Date.parse(iso)) / 1000);
  if (!Number.isFinite(s)) return '';
  if (s < 90) return 'just now';
  if (s < 90 * 60) return `${Math.round(s / 60)} min ago`;
  if (s < 36 * 3600) return `${Math.round(s / 3600)} h ago`;
  return `${Math.round(s / 86400)} d ago`;
}
