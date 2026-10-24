// /about's server read: the loop the film plays. Call it after `await connection()` (the source is picked per request).
import 'server-only';
import { getDataSource } from '@/server/data/select';
import type { DataSource } from '@/server/data/types';
import type { AboutData } from '../model/beats';

export function loadAboutData(ds: DataSource = getDataSource()): AboutData {
  return { beats: ds.getLoop().map((b) => ({ key: b.key, label: b.label, stage: b.stage, who: b.who, text: b.text })) };
}
