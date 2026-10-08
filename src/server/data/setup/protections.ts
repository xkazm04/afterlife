// Step 9 read back, read only: every setting the step lists, as GitLab answers it. Done only when each one reads back
// as listed; failed naming each that differs; unknown when one could not be read and none differs.
// docs.gitlab.com/api/protected_branches, /api/protected_tags, /api/project_job_token_scopes,
// /api/merge_request_approvals (Premium and up), and /user/project/codeowners for where GitLab looks for CODEOWNERS.
import { isKind } from '@/server/gitlab/errors';
import type { GlProject } from '@/server/gitlab/port';
import { belayOf, done, failed, Missing, obj, rows, targetOf, unknown, why, type StepCtx } from './ctx';
import type { StepRead } from './types';

type Rec = Record<string, unknown>;
/** null: the setting reads back as listed; a string: what differs. */
type Check = { label: string; run: () => Promise<string | null> };

/** GitLab's order: the first CODEOWNERS found is used. */
export const CODEOWNERS_PATHS = ['CODEOWNERS', 'docs/CODEOWNERS', '.gitlab/CODEOWNERS'] as const;
/** What the target's CODEOWNERS must cover: the CI file and the .gitlab/ folder (the agent config lives there). */
export const OWNED = ['.gitlab-ci.yml', '.gitlab/'] as const;

const DEVELOPER = 30;
const MAINTAINER = 40;

async function protection(c: StepCtx, p: GlProject, kind: 'protected_branches' | 'protected_tags', name: string): Promise<Rec | null> {
  try {
    return obj(await c.port.get(`projects/${p.id}/${kind}/${encodeURIComponent(name)}`), kind);
  } catch (e) {
    if (isKind(e, 'not-found')) return null;
    throw e;
  }
}

/** The access levels of one list (null: a user, group or role entry, not a level). */
const levels = (r: Rec, k: string): (number | null)[] => (Array.isArray(r[k]) ? (r[k] as Rec[]).map((x) => (typeof x?.access_level === 'number' && x.user_id == null && x.group_id == null ? x.access_level : null)) : []);
const letsDevelopers = (r: Rec, ...ks: string[]): boolean => ks.some((k) => levels(r, k).some((l) => l !== null && l > 0 && l <= DEVELOPER));

function guardedAgainstDevelopers(c: StepCtx, p: () => GlProject, kind: 'protected_branches' | 'protected_tags', name: string, what: string): Check {
  return {
    label: what,
    run: async () => {
      const r = await protection(c, p(), kind, name);
      const keys = kind === 'protected_tags' ? ['create_access_levels'] : ['push_access_levels', 'merge_access_levels'];
      if (!r) return `${what}: not protected`;
      const differ = [...(letsDevelopers(r, ...keys) ? ['Developers are allowed'] : []), ...(kind === 'protected_branches' && r.allow_force_push !== false ? ['force push is allowed'] : [])];
      return differ.length ? `${what}: ${differ.join(', ')}` : null;
    },
  };
}

/** A CODEOWNERS rule covers `path` when its pattern is the path, rooted or not, or the folder with a trailing glob. */
export function covers(codeowners: string, path: string): boolean {
  return codeowners.split('\n').some((line) => {
    const pattern = line.trim().split(/\s+/)[0] ?? '';
    if (!pattern || pattern.startsWith('#') || pattern.startsWith('[') || pattern.startsWith('^[')) return false;
    return pattern.replace(/^\//, '').replace(/\*+$/, '') === path;
  });
}

function checks(c: StepCtx): Check[] {
  const t = () => targetOf(c);
  const apply = () => belayOf(c, 'belay-apply');
  const allowlisted = (on: string): Check => ({
    label: `belay-apply on ${on}'s job token allowlist`,
    run: async () => {
      const list = rows(await c.port.get(`projects/${belayOf(c, on).id}/job_token_scope/allowlist`, { per_page: 100 }), 'allowlist');
      return list.some((x) => x.id === apply().id) ? null : `belay-apply is not on ${on}'s job token allowlist`;
    },
  });
  return [
    guardedAgainstDevelopers(c, t, 'protected_branches', 'main', 'the target’s main'),
    guardedAgainstDevelopers(c, t, 'protected_branches', 'belay/*', 'belay/* on the target'),
    {
      label: `CODEOWNERS on the target covering ${OWNED.join(' and ')}`,
      run: async () => {
        const base = t().defaultBranch ?? 'main';
        for (const path of CODEOWNERS_PATHS) {
          const f = await c.port.getFile(t().id, path, base);
          if (!f) continue;
          const missing = OWNED.filter((o) => !covers(f.content, o));
          return missing.length ? `${path} on ${base} does not cover ${missing.join(' or ')}` : null;
        }
        return `the target has no CODEOWNERS on ${base}`;
      },
    },
    {
      label: 'author cannot approve on the target',
      run: async () => (obj(await c.port.get(`projects/${t().id}/approvals`), 'approvals').merge_requests_author_approval === false ? null : 'authors can approve their own MRs on the target'),
    },
    {
      label: "belay-apply's main",
      run: async () => {
        const r = await protection(c, apply(), 'protected_branches', 'main');
        if (!r) return "belay-apply's main: not protected";
        const differ: string[] = [];
        const push = levels(r, 'push_access_levels');
        const merge = levels(r, 'merge_access_levels');
        if (push.length !== 1 || push[0] !== 0) differ.push('push is not No one');
        if (!merge.length || merge.some((l) => l !== MAINTAINER)) differ.push('merge is not Maintainers');
        if (r.code_owner_approval_required !== true) differ.push('Code Owner approval is off');
        if (r.allow_force_push !== false) differ.push('force push is allowed');
        return differ.length ? `belay-apply's main: ${differ.join(', ')}` : null;
      },
    },
    allowlisted('belay-engine'),
    allowlisted('belay-policy'),
    guardedAgainstDevelopers(c, () => belayOf(c, 'belay-engine'), 'protected_tags', 'v*', 'v* tags of belay-engine'),
    guardedAgainstDevelopers(c, () => belayOf(c, 'belay-pack'), 'protected_tags', 'v*', 'v* tags of belay-pack'),
    guardedAgainstDevelopers(c, () => belayOf(c, 'belay-ledger'), 'protected_branches', 'main', "belay-ledger's main"),
  ];
}

/** Step 9: done only when every setting it lists reads back as listed. */
export async function protectionsRead(c: StepCtx): Promise<StepRead> {
  if (!c.listing.ok) return unknown(`reading the protections failed: ${c.listing.reason}`);
  const all = checks(c);
  const seen = await Promise.all(all.map(async (k) => {
    try {
      const differs = await k.run();
      return { k, differs, unread: null };
    } catch (e) {
      return e instanceof Missing ? { k, differs: e.message, unread: null } : { k, differs: null, unread: `${k.label} (${why(e)})` };
    }
  }));
  const differ = [...new Set(seen.flatMap((x) => (x.differs ? [x.differs] : [])))];
  const unread = seen.flatMap((x) => (x.unread ? [x.unread] : []));
  const notRead = unread.length ? ` · not read: ${unread.join('; ')}` : '';
  if (differ.length) return failed(`${differ.join(' · ')}${notRead}`);
  if (unread.length) return unknown(`${all.length - unread.length} of ${all.length} settings read back as listed${notRead}`);
  return done(`${all.length} of ${all.length} settings read back as listed: ${all.map((k) => k.label).join(', ')}`);
}
