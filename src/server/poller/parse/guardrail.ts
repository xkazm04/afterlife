// Validates a `belay-guardrail` block (gitlab/flows/schemas/guardrail-verdict.schema.json). Only the fields Belay reads.
import { field, isRec, isStr } from './guards';

export interface GuardrailFinding {
  rule: string;
  severity: 'low' | 'medium' | 'high';
  file: string;
  quote: string;
  explanation: string;
}

export interface GuardrailBlock {
  verdict: 'pass' | 'block';
  headSha: string;
  findings: GuardrailFinding[];
}

const SEVERITY = ['low', 'medium', 'high'] as const;

function finding(f: unknown): GuardrailFinding | null {
  if (!isRec(f)) return null;
  const severity = SEVERITY.find((s) => s === f.severity);
  const rule = field(f, 'rule');
  const file = field(f, 'file');
  if (!severity || !rule || !file || !isStr(f.quote) || !isStr(f.explanation)) return null;
  return { rule, severity, file, quote: f.quote, explanation: f.explanation };
}

export function parseGuardrailBlock(raw: unknown): GuardrailBlock | null {
  if (!isRec(raw) || raw.schema !== 'belay.guardrail/1') return null;
  const verdict = raw.verdict === 'pass' || raw.verdict === 'block' ? raw.verdict : null;
  const headSha = field(raw, 'head_sha');
  if (!verdict || !headSha || !Array.isArray(raw.findings)) return null;
  const findings = raw.findings.map(finding);
  return findings.every((f): f is GuardrailFinding => f !== null) ? { verdict, headSha, findings } : null;
}
