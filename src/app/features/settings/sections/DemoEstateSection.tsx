'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { SegmentedControl, type SegmentOption } from '@/components/controls/toolbar/SegmentedControl';
import { useShellInfo } from '@/components/shell/ShellContext';
import { plural } from '@/lib/format/plural';
import { DEFAULT_DEMO_ESTATE, DEMO_ESTATES, DEMO_ESTATE_LABEL, demoEstateCookie, estateOf, type DemoEstate, type Estate } from '@/lib/settings/demoEstate';
import { SettingsSection } from '../components/SettingsSection';
import styles from './Table.module.css';

const TITLES: Record<DemoEstate, string> = {
  auto: 'Auto: the invented estate shows only while no real project is saved (the default)',
  on: 'On: every demo screen shows, bannered beside your real projects',
  off: 'Off: only the real tools in the sidebar; a demo screen opened by URL says it is demo data',
};
const OPTIONS: readonly SegmentOption<DemoEstate>[] = DEMO_ESTATES.map((v) => ({ value: v, label: DEMO_ESTATE_LABEL[v], title: TITLES[v] }));

/** What the choice does here and now, with the real projects saved. */
export function estateNote(e: Estate): string {
  const saved = `${plural(e.real, 'real project')} saved`;
  return e.demo ? `Demo estate shown · ${saved}` : `Demo estate hidden from the sidebar · ${saved}`;
}

/**
 * "Show demo estate": Auto, On or Off, kept in a cookie (the server draws the nav and the door's way in), then the
 * route renders again so the sidebar follows at once. Before the shell's read lands it shows the default.
 */
export function DemoEstateSection() {
  const { estate } = useShellInfo();
  const router = useRouter();
  const [picked, setPicked] = useState<DemoEstate | null>(null);
  const value = picked ?? estate?.setting ?? DEFAULT_DEMO_ESTATE;
  const choose = (v: DemoEstate) => {
    setPicked(v);
    try {
      document.cookie = demoEstateCookie(v);
    } catch {
      return; // a blocked cookie store must never break the page
    }
    router.refresh();
  };
  return (
    <SettingsSection id="demo-estate" title="Show demo estate">
      <div className={styles.line}>
        <SegmentedControl label="Show demo estate" options={OPTIONS} value={value} onChange={choose} />
        <span className={styles.note}>{estate ? estateNote(estateOf(value, estate.real)) : 'Reading the saved projects…'}</span>
      </div>
    </SettingsSection>
  );
}
