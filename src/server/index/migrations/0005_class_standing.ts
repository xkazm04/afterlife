// A class tier row says, as its move, when the gate grants the class nothing: 'no_record' (no agent in tier-state.yml
// holds it) and 'refused' (several agents hold it and none is named for the role). Both are stored quarantined, the
// tier the gate acts on; the move keeps them apart from a tripwire quarantine.
import { type Migration } from './parts';

export const m0005: Migration = {
  version: 5,
  name: 'class_standing',
  sql: `
alter table class_tier drop constraint class_tier_move_kind_check;
alter table class_tier add constraint class_tier_move_kind_check
  check (move_kind in ('promoted','demoted','tripwire','ineligible','note','no_record','refused'));
`,
};
