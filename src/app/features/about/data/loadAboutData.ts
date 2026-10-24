// /about's server read: the loop the film plays and the data mode its pill names. Call it after `await connection()`
// (the source is picked per request). The pill says what the status bar says (dataLabel over readShellInfo): demo is
// "illustrative demo data"; live is the live label, and the beats stay marked illustrative while the live source still
// serves the loop from the demo's catalogue (its `illustrative` parts), so no demo number is ever called real.
import 'server-only';
import { dataLabel } from '@/components/shell/bars/dataLabel';
import { getDataSource } from '@/server/data/select';
import { readShellInfo } from '@/server/data/shell/read';
import type { DataSource } from '@/server/data/types';
import type { AboutData } from '../model/beats';

export function loadAboutData(ds: DataSource = getDataSource(), env: Record<string, string | undefined> = process.env): AboutData {
  const beats = ds.getLoop().map((b) => ({ key: b.key, label: b.label, stage: b.stage, who: b.who, text: b.text }));
  const demo = ds.mode === 'demo';
  return {
    beats,
    mode: {
      mode: demo ? 'demo' : 'live',
      label: demo ? 'illustrative demo data' : dataLabel(readShellInfo(ds, env).data),
      beatsIllustrative: demo || ds.illustrative.includes('loop'),
    },
  };
}
