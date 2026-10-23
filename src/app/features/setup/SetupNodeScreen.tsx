'use client';

import { notFound } from 'next/navigation';
import { DetailPage } from '@/components/shell/detail/DetailPage';
import { NodeBody } from './components/inspector/NodeBody';
import { nodeHead } from './components/inspector/nodeHead';
import { SetupLegend } from './components/SetupLegend';
import { SetupStatus } from './components/SetupStatus';
import { useSetup } from './hooks/SetupContext';
import type { Focus } from './model/types';

/** /setup/[node]: one step, track or capability of the unlock map as a page. The flow is the map's, from the layout. */
export function SetupNodeScreen({ focus }: { focus: Focus }) {
  const { state, tracks } = useSetup();
  const head = nodeHead(state, tracks, focus);
  if (!head) notFound(); // live mode may not hold a capability the catalogue names
  return (
    <DetailPage
      parent={{ label: 'Setup', href: '/setup' }}
      title={head.title}
      lede={<span title={head.tip}>{head.lede}</span>}
      subtitle={`${state.group} / ${state.project}`}
      status={<SetupStatus />}
      help={<SetupLegend where="page" />}
      helpTitle="Legend"
    >
      <NodeBody focus={focus} />
    </DetailPage>
  );
}
