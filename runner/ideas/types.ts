// One shortcoming a scan found, as the plan prompt shows it: where it came from, its id there, and what it says.
import type { IdeaSource } from '../../src/schemas/run';

export interface Idea {
  source: IdeaSource;
  /** Its id in the source (a lens-scan proposal id, a scan stage). */
  ref: string;
  /** Short labels after the ref: lens/feature, size, tier, status, or a scan rung. */
  tags: string[];
  title: string;
  /** One line of evidence: the scan's why, the proposal's description. */
  detail: string;
}
