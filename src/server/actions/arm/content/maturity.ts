// T6, the maturity scan: the maturity-scan component, report-only. It scores what a job token can read into a facts file
// on the "maturity" schedule; the rest is recorded as unknown.
//
// The example also includes three scanner templates (Jobs/SAST, Jobs/Dependency-Scanning, Jobs/Secret-Detection). They
// are GitLab's own, not belay-pack's, and their names are still [R?] (Jobs/ vs Security/ on the instance version), so the
// block does not add them: a TrackArm names belay-pack components only, and Belay does not write a template name it has
// not confirmed. The notes ask the person to include them, as the example does, outside the block.
import { enginePin, NO_WRITE_TOKEN, type TrackArm } from './shape';

// The example gives maturity-scan no stage: the component's default, .post, which every pipeline has.
const T6_STAGES = { 'maturity-scan': ['.post'] } as const;

export const T6: TrackArm = {
  track: 'T6',
  key: 'maturity',
  title: 'Arm T6 maturity: score the project on a schedule',
  stages: ['.post'],
  stageChoices: T6_STAGES,
  includes: (pin) => [{ component: 'maturity-scan', inputs: enginePin(pin) }],
  notes: [
    'maturity-scan runs only in a scheduled (or API) pipeline whose BELAY_SCAN is maturity: add a daily "maturity" schedule on the default branch yourself, owned by a person.',
    NO_WRITE_TOKEN,
    'It scores what a job token can read; the rest is recorded as unknown.',
    'The block adds no scanner. Include GitLab\'s Jobs/SAST, Jobs/Dependency-Scanning and Jobs/Secret-Detection templates yourself, outside the block, as the example does (confirm Jobs/ vs Security/ on your instance): T1 reads their findings.',
  ],
};
