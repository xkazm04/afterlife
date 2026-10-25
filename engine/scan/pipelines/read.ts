// The Azure Pipelines and GitHub Actions files of a checkout, read into jobs beside the GitLab ones. Which files: by path
// (azure-pipelines.yml, .azure-pipelines/, pipelines/, .github/workflows/), then by shape (a pipelines/ file with no
// stages, jobs or steps is not a pipeline). A file another pipeline opens as a template is read there, not again alone.
import { isAzurePipeline, readAzure } from './azure';
import { isWorkflow, readGithub } from './github';
import type { Open, Read } from './shared';

export const AZURE = /^(azure-pipelines\.ya?ml|\.azure-pipelines\/.+\.ya?ml|pipelines\/.+\.ya?ml)$/;
export const GITHUB = /^\.github\/workflows\/[^/]+\.ya?ml$/;

/** Reads every pipeline file among `paths`. A file that does not parse is unresolved: a job may be in it. */
export function readPipelines(paths: readonly string[], open: Open): Read {
  const templates = new Set<string>();
  const byFile: { file: string; read: Read }[] = [];
  const unresolved: string[] = [];
  for (const file of [...paths].sort()) {
    const azure = AZURE.test(file);
    if (!azure && !GITHUB.test(file)) continue;
    let doc: unknown;
    try {
      doc = open(file);
    } catch (e) {
      unresolved.push(`${file} (not valid YAML: ${(e as Error).message.split('\n')[0]})`);
      continue;
    }
    if (azure && isAzurePipeline(doc)) byFile.push({ file, read: readAzure(doc, file, open, templates) });
    else if (!azure && isWorkflow(doc)) byFile.push({ file, read: readGithub(doc, file) });
  }
  const kept = byFile.filter((r) => !templates.has(r.file));
  return {
    jobs: kept.flatMap((r) => r.read.jobs),
    unresolved: [...unresolved, ...kept.flatMap((r) => r.read.unresolved)],
  };
}
