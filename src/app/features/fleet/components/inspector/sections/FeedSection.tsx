import { InspectorSection } from '@/components/inspector/InspectorSection';
import { KeyValue } from '@/components/inspector/KeyValue';
import type { FleetProject } from '@/lib/demo/types';
import type { SectionProps } from '../../../hooks/useSectionOpen';
import { feedRows } from '../../../model/inspector';
import type { DeepProject } from '../../../model/types';
import { DemoChip } from '../DemoChip';
import styles from './sections.module.css';

/**
 * Last poll, feed health, environments, open CRA items; the deep project adds its webhooks and unattributed events,
 * labelled demo when they are the catalogue's (`demoCockpit`).
 */
export function FeedSection({ p, deep, demoCockpit, sec }: { p: FleetProject; deep: DeepProject; demoCockpit: boolean; sec: SectionProps }) {
  const rows = feedRows(p, p.id === deep.id ? deep : null).map(({ label, value, bad, cockpit }) => {
    if (bad) return [label, <span key="v" className={styles.err}>{value}</span>] as const;
    if (cockpit && demoCockpit) return [label, <span key="v">{value} <DemoChip /></span>] as const;
    return [label, value] as const;
  });
  return (
    <InspectorSection title="Feed" {...sec}>
      <KeyValue rows={rows} />
    </InspectorSection>
  );
}
