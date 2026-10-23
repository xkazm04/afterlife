// What Belay keeps in this browser's localStorage, for the About page. Plain data; each key is the constant its module
// stores under, and browserKeys.test.ts fails when a module stores under a key this list does not show.
import { QUALITY_KEY } from '../../door/model/fit';
import { BASELINE_KEY } from '../../fleet/model/changes/baseline';
import { TEXT_SIZE_STORAGE_KEY } from '@/lib/settings/textSize';

export const BROWSER_KEYS: readonly { what: string; key: string }[] = [
  { what: 'Text size', key: TEXT_SIZE_STORAGE_KEY },
  { what: 'Fleet "Changed since last look"', key: BASELINE_KEY },
  { what: 'Front door render tier', key: QUALITY_KEY },
];
