import type { ShellData } from '../ShellContext';

/**
 * The status bar's data label. Demo says "illustrative demo data" and nothing else ever does. One short line. Null (the
 * shell's read has not streamed in yet) is unknown: a dash, never demo. `real` is a screen that reads only a real
 * project's own files (Vitals, the onboarding wizard): the data mode, which is about the GitLab estate, does not apply.
 */
export function dataLabel(d: ShellData | null, real = false): string {
  if (real) return 'real project data';
  if (!d) return 'data —';
  if (d.mode === 'demo') return 'illustrative demo data';
  if (d.fakeGitlab) return 'live mode · seeded fake GitLab, not a real group';
  const base = `live data · ${d.group}`;
  return d.illustrative ? `${base} · some parts still demo, marked` : base;
}
