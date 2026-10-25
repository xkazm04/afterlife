// A GitHub Actions workflow read into the jobs the rules credit: each job's run scripts, the actions its steps use, its
// display name. A job that calls a reusable workflow in another repository is unresolved.
import { isRecord } from '../../core/types';
import { aliasesOf, items, type Read } from './shared';

const JUNIT = /^(dorny\/test-reporter|mikepenz\/action-junit-report|EnricoMi\/publish-unit-test-result-action)(\/|@)/i;

/** True when the document is a workflow with jobs. */
export const isWorkflow = (d: unknown): d is Record<string, unknown> => isRecord(d) && isRecord(d.jobs);

export function readGithub(doc: Record<string, unknown>, file: string): Read {
  const out: Read = { jobs: [], unresolved: [] };
  for (const [id, v] of Object.entries(isRecord(doc.jobs) ? doc.jobs : {})) {
    if (!isRecord(v)) continue;
    if (typeof v.uses === 'string') {
      // a local reusable workflow is a workflow file this scan reads on its own
      if (!v.uses.startsWith('./')) out.unresolved.push(`${file}: ${v.uses}`);
      continue;
    }
    const script: string[] = [];
    const tasks: string[] = [];
    for (const s of items(v.steps)) {
      if (!isRecord(s)) continue;
      if (typeof s.run === 'string') script.push(s.run);
      if (typeof s.uses === 'string') tasks.push(s.uses);
    }
    out.jobs.push({
      name: id,
      stage: null,
      script: script.join('\n'),
      junit: tasks.some((t) => JUNIT.test(t)),
      release: false,
      sbom: false,
      file,
      aliases: aliasesOf(id, v.name),
      tasks,
    });
  }
  return out;
}
