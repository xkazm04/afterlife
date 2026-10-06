'use client';

import { useMemo, useRef } from 'react';
import { usePopover } from '@/components/overlays/popover/usePopover';
import { useSetup } from '../../hooks/SetupContext';
import { buildEdges } from '../../model/map/edges';
import { GRAPH } from '../../model/map/appGraph';
import { focusEq } from '../../model/types';
import { CapColumn } from './columns/CapColumn';
import { StepColumn } from './columns/StepColumn';
import { TrackColumn } from './columns/TrackColumn';
import { EdgeLayer } from './EdgeLayer';
import type { NodeEvents } from './nodes/nodeTypes';
import { useEdgeGeometry } from './useEdgeGeometry';
import styles from './UnlockMap.module.css';

/**
 * The unlock map: steps 0-14 by phase, the eight tracks in arm order, the belay doctor capabilities, and the drawn
 * edges between them. Hover or pick a node and what it needs and frees lights up; the rest dims.
 */
export function UnlockMap() {
  const { state, view, openInspector } = useSetup();
  const canvas = useRef<HTMLElement>(null);
  const { show, hide, popover } = usePopover();
  const measured = useEdgeGeometry(canvas);
  const { hot, sel, pick, setHover } = view;

  const edges = useMemo(() => (measured ? buildEdges(GRAPH, state, measured.geom, hot, measured.scale) : []), [measured, state, hot]);
  const events = useMemo<NodeEvents>(
    () => ({
      onPick: (f) => {
        hide();
        if (!focusEq(sel, f)) openInspector();
        pick(f);
      },
      onEnter: (f, el, tip) => {
        setHover(f);
        show(el, tip, { delay: true });
      },
      onLeave: () => {
        setHover(null);
        hide();
      },
    }),
    [sel, pick, setHover, show, hide, openInspector],
  );

  return (
    <section ref={canvas} className={styles.map} aria-label="Unlock map">
      <EdgeLayer edges={edges} dim={!!hot} />
      <div className={styles.cols}>
        <StepColumn events={events} />
        <div />
        <TrackColumn events={events} />
        <div />
        <CapColumn events={events} />
      </div>
      {popover}
    </section>
  );
}
