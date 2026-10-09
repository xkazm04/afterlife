'use client';

import type { MouseEvent } from 'react';
import { InspectorSection } from '@/components/inspector/InspectorSection';
import { HonestyChip } from '@/components/status/chip/HonestyChip';
import { useToast } from '@/components/overlays/toast/useToast';
import type { Stage } from '@/schemas';
import { gitlabUrl } from '../../data/meta';
import type { EvidenceRung } from '../../data/types';
import type { MaturityCtx } from '../../model/ctx';
import { nextOf, type Level } from '../../model/rungs';
import { cx } from '../cx';
import { BoltGlyph } from './BoltGlyph';
import styles from './inspector.module.css';

const RUNGS: readonly EvidenceRung[] = [4, 3, 2, 1];

/**
 * Evidence per rung, top rung first like the crag: what each rung's detector read, as links into GitLab. The next
 * rung shows what it still lacks. A file can only ever earn R1: presence is not behaviour. In live mode the demo's evidence
 * objects are not shown: the scan's own one-line note stands in for them (the view carries no object links yet), and a rung
 * this session's simulated rescan credited says it was simulated.
 */
export function EvidenceSection({
  ctx,
  stage,
  now,
  open,
  onOpenChange,
}: {
  ctx: MaturityCtx;
  stage: Stage;
  now: Level;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { toast, status } = useToast();
  const ev = ctx.evidence?.[stage];
  const base = ctx.base[stage];
  const nx = nextOf(now, base.next);
  const deep = now != null && now >= 3;
  const creditedBy = (g => (g ? `gap ${g.id}` : 'its MR'))(ctx.gapByStage(stage));
  const link = (path: string) => (e: MouseEvent) => {
    e.preventDefault();
    const msg = `would open in GitLab: ${gitlabUrl(path).replace('https://', '')}`;
    toast(msg);
    status(ctx.nowClock ? `${ctx.nowClock} · ${msg}` : msg);
  };

  return (
    <InspectorSection title="Evidence" aux={`${now ?? '?'} of 4 rungs`} open={open} onOpenChange={onOpenChange}>
      {RUNGS.map((r) => {
        const on = now != null && r <= now;
        const isNext = r === nx && nx > (now ?? -1);
        const objs = ev?.objs[r] ?? [];
        const count = objs.length || 1;
        return (
          <div key={r}>
            <div className={cx(styles.rg, !on && (isNext ? styles.nx : styles.off))}>
              <BoltGlyph on={on} deep={deep} next={isNext} />
              <span>{`R${r} ${ctx.rungNames[r] ?? ''}`}</span>
              <span className={styles.aux}>{on ? `${count} object${count > 1 ? 's' : ''}` : isNext ? 'next' : '—'}</span>
            </div>
            {isNext && ev ? <div className={styles.lack}>{ev.missing}</div> : null}
            {on && objs.length
              ? objs.map((o) => (
                  <div key={o.label} className={styles.ob}>
                    <span className={cx(styles.kd, o.kind === 'file' && styles.file)}>{o.kind}</span>
                    <a href={gitlabUrl(o.path)} title={`${o.label} · ${o.ref}`} onClick={link(o.path)}>
                      {o.label} ↗
                    </a>
                  </div>
                ))
              : null}
            {on && !objs.length && (ev || r > (base.now ?? -1)) ? (
              <div className={styles.ob}>
                <span className={styles.kd}>rescan</span>
                <span className={styles.muted}>{`credited after ${creditedBy} · engine ${ctx.engine}`}</span>
                <HonestyChip kind="simulated" />
              </div>
            ) : null}
          </div>
        );
      })}
      {ev ? null : (
        <div className={styles.ob}>
          <span className={styles.kd}>scan</span>
          <span className={styles.muted}>{ctx.scanned ? `${base.evidence} · engine ${ctx.engine}` : 'not scanned yet'}</span>
        </div>
      )}
    </InspectorSection>
  );
}
