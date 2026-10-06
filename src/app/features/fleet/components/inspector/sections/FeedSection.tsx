import { InspectorSection } from '@/components/inspector/InspectorSection';
import { KeyValue } from '@/components/inspector/KeyValue';
import type { FleetProject } from '@/lib/demo/types';
import type { SectionProps } from '../../../hooks/useSectionOpen';
import { feedRows } from '../../../model/inspector';
import type { DeepProject } from '../../../model/types';
import styles from './sections.module.css';

/** Last poll, feed health, environments, open CRA items; the deep project adds its webhooks and unattributed events. */
export function FeedSection({ p, deep, sec }: { p: FleetProject; deep: DeepProject; sec: SectionProps }) {
  const rows = feedRows(p, p.id === deep.id ? deep : null).map(({ label, value, bad }) => [label, bad ? <span className={styles.err}>{value}</span> : value] as const);
  return (
    <InspectorSection title="Feed" {...sec}>
      <KeyValue rows={rows} />
    </InspectorSection>
  );
}
