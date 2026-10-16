// stage_cell keeps every scan (primary key project_id, stage, scanned_at), and latestStageCells / latestScanAt read
// max(scanned_at) of one project. The key cannot answer that (stage sits between the two), so each read walked the
// project's whole history, 9 rows per scan. This index orders a project's rows by scan time: max(scanned_at) is the
// last entry. Additive only; no row is read, moved or removed by it.
import { type Migration } from '../parts';

export const m0015: Migration = {
  version: 15,
  name: 'stage_cell_scan_idx',
  sql: `
create index stage_cell_scan_idx on stage_cell (project_id, scanned_at);
`,
};
