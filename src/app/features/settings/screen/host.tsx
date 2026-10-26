'use client';

// Settings on the screen host (docs/features/screen-host.md). Display, Keyboard and About are static: no slice, the
// whole window paints in the click's frame. Data & connection has one slice, `connection` (the server's environment as
// four strings); its card draws its rows with dashes until then.
// Reveal order (every sub-page):
//   0  window chrome, sidebar sub-navigation, status line    at once
//   1  heading and lede                                     on mount
//   2  the first section (Data: the Connection card)         on mount (Data: when `connection` lands)
//   3  the next section (Keyboard: per screen; Data: Show demo estate)   on mount
import type { ReactNode } from 'react';
import { Reveal, useSlice, type ScreenDef } from '@/components/shell/host';
import { AboutSection } from '../components/AboutSection';
import { KeyboardSection } from '../components/KeyboardSection';
import { TextSizeSection } from '../components/TextSizeSection';
import type { ConnectionRead } from '../data/connection';
import { SETTINGS_PAGES } from '../model/settingsNav';
import { ConnectionSection } from '../sections/ConnectionSection';
import { DemoEstateSection } from '../sections/DemoEstateSection';
import { ScreenKeysSection } from '../sections/ScreenKeysSection';
import { SettingsWindow } from '../SettingsWindow';

/** Each sub-page's heading and lede: the window's subtitle and the pane's first lines. */
const SETTINGS_COPY = {
  display: { title: 'Display', lede: 'How large the text and controls are in this browser.' },
  keyboard: { title: 'Keyboard', lede: 'Shortcuts that work everywhere, then the ones each screen adds.' },
  data: { title: 'Data & connection', lede: "Where the numbers come from. Read from the server's environment; no tokens are shown." },
  about: { title: 'About', lede: 'Which build this is, and what it keeps in your browser.' },
} as const;

type Page = keyof typeof SETTINGS_COPY;

function Sub({ page, children }: { page: Page; children: ReactNode }) {
  const c = SETTINGS_COPY[page];
  return (
    <SettingsWindow title={c.title} lede={c.lede}>
      {children}
    </SettingsWindow>
  );
}

function DisplayFrame() {
  return (
    <Sub page="display">
      <Reveal order={2}>
        <TextSizeSection />
      </Reveal>
    </Sub>
  );
}

function KeyboardFrame() {
  return (
    <Sub page="keyboard">
      <Reveal order={2}>
        <KeyboardSection />
      </Reveal>
      <Reveal order={3}>
        <ScreenKeysSection />
      </Reveal>
    </Sub>
  );
}

function DataFrame() {
  const conn = useSlice<ConnectionRead>('connection');
  return (
    <Sub page="data">
      <Reveal order={2} slice="connection">
        <ConnectionSection read={conn.state === 'ok' ? conn.data : undefined} />
      </Reveal>
      <Reveal order={3}>
        <DemoEstateSection />
      </Reveal>
    </Sub>
  );
}

function AboutFrame() {
  return (
    <Sub page="about">
      <Reveal order={2}>
        <AboutSection />
      </Reveal>
    </Sub>
  );
}

const label = (page: Page): string => SETTINGS_PAGES.find((p) => p.key === page)?.label ?? SETTINGS_COPY[page].title;
const title = (page: Page) => () => `Afterlife · Settings · ${label(page)}`;

export const screens: readonly ScreenDef[] = [
  { key: 'settings/display', ready: true, slices: [], Frame: DisplayFrame, title: title('display') },
  { key: 'settings/data', ready: true, slices: ['connection'], Frame: DataFrame, title: title('data') },
  { key: 'settings/keyboard', ready: true, slices: [], Frame: KeyboardFrame, title: title('keyboard') },
  { key: 'settings/about', ready: true, slices: [], Frame: AboutFrame, title: title('about') },
];
