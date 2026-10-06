// The nine stages as published in the hackathon rules (5 Oct 2026). "configure" replaced
// "deploy". The grid is data so a different list costs an hour, not a day.

export const STAGES = ['plan', 'create', 'verify', 'package', 'secure', 'release', 'configure', 'monitor', 'govern'] as const;
export type Stage = (typeof STAGES)[number];

// Presence is not behaviour: a stage holds the highest rung whose evidence is a GitLab object.
export const RUNGS = ['absent', 'configured', 'running', 'enforced', 'self-proving'] as const;
export type Rung = (typeof RUNGS)[number];

export interface StageCell {
  stage: Stage;
  rung: Rung | null; // null = unknown; never treated as absent
  depth: 'deep' | 'touch';
  evidence: { label: string; url: string }[]; // every lit cell links to a GitLab object
  tracks: number[]; // 1..8
  engine_version: string;
  scanned_at: string;
}

/** "n / 9 stages with evidence": unknown cells never count. */
export function stagesWithEvidence(cells: readonly StageCell[]): number {
  return cells.filter((c) => c.rung !== null && c.rung !== 'absent' && c.evidence.length > 0).length;
}
