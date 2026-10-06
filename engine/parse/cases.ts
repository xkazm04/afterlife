// Finds the test a proof is about in a job's results (JUnit when there is one, otherwise the raw trace).
import { parseJUnit, type TestCase } from './junit';
import { parseTrace } from './trace';

export interface JobEvidence {
  junit?: string;
  trace?: string;
  job_ref?: string; // GitLab job URL or id, recorded as evidence
}

export function casesOf(job: JobEvidence): TestCase[] {
  const fromXml = job.junit ? parseJUnit(job.junit) : [];
  return fromXml.length > 0 ? fromXml : job.trace ? parseTrace(job.trace) : [];
}

const bare = (s: string): string => s.replace(/\(\)$/, '');
const inClass = (cls: string, id: string): boolean => cls === id || cls.endsWith(`.${id}`) || cls.endsWith(`/${id}`);

/**
 * An id names a whole class (`StatementExportTraversalTest`), or one case: `name`, `Class.name` or `Class#name`.
 * Class names may be short or fully qualified; a trailing `()` is ignored.
 */
export function matchesTestId(c: TestCase, rawId: string): boolean {
  const id = bare(rawId);
  const name = bare(c.name);
  if (name === id || inClass(c.classname, id)) return true;
  const hash = id.lastIndexOf('#');
  if (hash > 0) return name === id.slice(hash + 1) && inClass(c.classname, id.slice(0, hash));
  const dot = id.lastIndexOf('.');
  return dot > 0 && name === id.slice(dot + 1) && inClass(c.classname, id.slice(0, dot));
}

export function findCases(cases: readonly TestCase[], id: string): TestCase[] {
  return cases.filter((c) => matchesTestId(c, id));
}

export const caseKey = (c: TestCase): string => `${c.classname}#${c.name.replace(/\(\)$/, '')}`;
export const isRed = (c: TestCase): boolean => c.status === 'failed' || c.status === 'error';
