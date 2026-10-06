// The note bodies the Belay components write (gitlab/components/scripts/proof/post-proof.mjs and the guardrail flow):
// a headline, a fenced JSON block and the Belay-Task trailer.
import type { ProofBlock } from '@/schemas/proof';

/** Same escaping as lib.mjs `fence`: a backtick can only sit inside a string, so it is written as `. */
export function fence(tag: string, value: unknown): string {
  return '```' + tag + '\n' + JSON.stringify(value, null, 2).replaceAll('`', '\\u0060') + '\n```';
}

export function proofNote(block: ProofBlock): string {
  const failed = block.checks.filter((c) => c.ok === false).length;
  return [
    `**Belay proof: ${block.verdict.toUpperCase()}** | class \`${block.class}\` | ${block.checks.length} checks, ${failed} failed | engine ${block.engine.version}`,
    '',
    fence('belay-proof', block),
    '',
    block.task.trailer,
  ].join('\n');
}

export interface GuardrailFinding { rule: string; severity: 'low' | 'medium' | 'high'; file: string; quote: string; explanation: string }

export function guardrailNote(verdict: 'pass' | 'block', headSha: string, findings: GuardrailFinding[]): string {
  return [
    `**Belay guardrail: ${verdict.toUpperCase()}** | ${findings.length} finding(s)`,
    '',
    fence('belay-guardrail', { schema: 'belay.guardrail/1', verdict, head_sha: headSha, findings }),
  ].join('\n');
}
