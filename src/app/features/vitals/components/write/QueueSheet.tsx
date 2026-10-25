'use client';

import { useMemo, useState } from 'react';
import type { QueueRuns } from '@/server/actions/types';
import { useProjectWrite } from '../../hooks/useProjectWrite';
import type { AdjustmentRow } from '../../model/types';
import { ProjectWriteSheet } from './ProjectWriteSheet';
import styles from './write.module.css';

/** "Queue N runs": pick N (1 to 5), see the server's exact queue commands (its preview), confirm to queue them as you. */
export function QueueSheet({ slug, row, onClose }: { slug: string; row: AdjustmentRow; onClose: () => void }) {
  const [n, setN] = useState(3);
  const q = row.remeasure?.queue;
  const intent = useMemo<QueueRuns | null>(() => (q ? { kind: 'queue-runs', project: slug, claimId: row.claim.id, pipelineId: q.pipelineId, branch: q.branch, n } : null), [q, slug, row.claim.id, n]);
  const write = useProjectWrite(intent, `queue ${n} run${n === 1 ? '' : 's'} on ${q?.branch ?? '?'}`);
  return (
    <ProjectWriteSheet
      title={`Queue runs · ${row.claim.title}`}
      subtitle="your az login · each run spends pipeline time · Afterlife measures them once collected"
      write={write}
      confirm={`Queue ${n} as you`}
      onClose={onClose}
      controls={
        <label className={styles.controls}>
          Runs to queue
          <select value={n} onChange={(e) => setN(Number(e.target.value))} disabled={write.sending || write.done}>
            {[1, 2, 3, 4, 5].map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
          {n < 3 ? <span>fewer than 3 cannot give a verdict on a wall time</span> : null}
        </label>
      }
    />
  );
}
