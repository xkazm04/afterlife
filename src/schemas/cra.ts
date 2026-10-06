// EU Cyber Resilience Act reporting clock. Belay drafts; a person submits on ENISA's platform.
// Figures (24 h, 72 h, 14 days after a fix, one month after notification) come from
// the European Commission CRA reporting guidance; reconcile against the regulation text before the video.
// The clock starting at awareness is an assumption [A].

export interface CraClock {
  id: string; // CRA-2026-0001
  kind: 'vulnerability' | 'incident';
  aware_at: string;
  product: { name: string; release: string; sbom_ref: string };
  due: { early_warning: string; notification: string; final: string | null };
  state: 'drafting' | 'awaiting_signoff' | 'submitted' | 'closed';
  submitted_by: string | null; // always a human; never automatic
  evidence: string[]; // GitLab object URLs, each resolved by API before a draft is allowed
  drill: boolean; // seeded demo clocks say so everywhere
}

const HOUR = 3_600_000;

export function due(kind: CraClock['kind'], awareAt: Date, fixAvailableAt?: Date, notifiedAt?: Date) {
  const early = new Date(+awareAt + 24 * HOUR);
  const notification = new Date(+awareAt + 72 * HOUR);
  const final =
    kind === 'vulnerability'
      ? fixAvailableAt
        ? new Date(+fixAvailableAt + 14 * 24 * HOUR)
        : null
      : notifiedAt
        ? new Date(+notifiedAt + 30 * 24 * HOUR) // "one month" taken as 30 days [A]
        : null;
  return { early_warning: early, notification, final };
}
