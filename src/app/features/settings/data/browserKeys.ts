// What Belay keeps in this browser's localStorage, for the About page. Plain data; each key is the constant its module
// stores under, and browserKeys.test.ts fails when a module stores under a key this list does not show.
import { QUALITY_KEY } from '../../door/model/fit';
import { BASELINE_KEY } from '../../fleet/model/changes/baseline';
import { TEXT_SIZE_STORAGE_KEY } from '@/lib/settings/textSize';
import { NAV_ARM_KEY } from '@/components/shell/nav/navArm';
import { XRAY_FIRST_KEY, XRAY_SEEN_KEY } from '../../xray/model/keys';

export const BROWSER_KEYS: readonly { what: string; key: string }[] = [
  { what: 'Text size', key: TEXT_SIZE_STORAGE_KEY },
  { what: 'Fleet "Changed since last look"', key: BASELINE_KEY },
  { what: 'Front door render tier', key: QUALITY_KEY },
  { what: 'X-ray first visit (it opens once, on the demo)', key: XRAY_FIRST_KEY },
  { what: 'X-ray screens seen (the sidebar First run)', key: XRAY_SEEN_KEY },
  { what: 'Dev-only navigation prototype arm (next dev only)', key: NAV_ARM_KEY },
];
