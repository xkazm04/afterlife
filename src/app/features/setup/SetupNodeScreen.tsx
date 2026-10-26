'use client';

import { DetailPage } from '@/components/shell/detail/DetailPage';
import { Reveal, Unread, useSlice } from '@/components/shell/host';
import { NodeBody } from './components/inspector/NodeBody';
import { nodeHead } from './components/inspector/nodeHead';
import { StatusPending } from './components/pending/SetupPending';
import { SetupLegend } from './components/SetupLegend';
import { SetupNodeNotFound } from './components/SetupNodeNotFound';
import { SetupStatus } from './components/SetupStatus';
import { useSetupMaybe } from './hooks/SetupContext';
import { useSetupFeed } from './hooks/session/feed';
import { parseNodeKey, universeOf } from './model/nodeKey';
import styles from './SetupScreen.module.css';

/**
 * /setup/[node]: one step, track or capability of the unlock map as a page. The flow is the map's (the Setup session).
 * `node` is the address's segment: it resolves against the catalogue once it is read, so until then the page is its
 * heading with dashes. A segment the catalogue does not hold, or a capability live's doctor does not report, is the
 * not-found card (the server answers notFound for the first already; the client checks both).
 */
export function SetupNodeScreen({ node }: { node: string }) {
  useSetupFeed();
  const api = useSetupMaybe();
  const catalogue = useSlice<unknown>('catalogue');
  const focus = api ? parseNodeKey(node, universeOf(Object.keys(api.state.steps).map(Number), Object.keys(api.state.arm), api.state.live)) : null;
  const head = api && focus ? nodeHead(api.state, api.tracks, focus) : null;
  if (api && !head) return <SetupNodeNotFound />;
  const state = api?.state;
  return (
    <DetailPage
      parent={{ label: 'Setup', href: '/setup' }}
      title={head?.title ?? 'Setup'}
      lede={head ? <span title={head.tip}>{head.lede}</span> : catalogue.state === 'error' ? `Setup could not be read: ${catalogue.reason}` : <Unread label="node not read yet" />}
      subtitle={state ? `${state.group} / ${state.project}` : '— / —'}
      status={api ? <SetupStatus /> : <StatusPending />}
      help={<SetupLegend where="page" />}
      helpTitle="Legend"
    >
      {focus ? (
        <Reveal order={1} slice="catalogue" className={styles.bodyRegion}>
          <NodeBody focus={focus} />
        </Reveal>
      ) : null}
    </DetailPage>
  );
}
