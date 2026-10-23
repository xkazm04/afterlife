'use client';

import { Spacer } from '@/components/controls/Spacer';
import { Lozenge } from '@/components/controls/lozenge/Lozenge';
import { LozengeButton } from '@/components/controls/lozenge/LozengeButton';
import { LozengeDivider } from '@/components/controls/lozenge/LozengeDivider';
import { PopupButton } from '@/components/controls/toolbar/PopupButton';
import { ToolbarButton } from '@/components/controls/toolbar/ToolbarButton';
import { useMenu } from '@/components/overlays/menu/useMenu';
import { OTHER_GROUP } from '../../data/capabilities';
import { useSetup } from '../../hooks/SetupContext';
import { doctorCounts } from '../../model/flow/state';
import type { CapStatus, SetupState } from '../../model/types';
import { Spinner } from '../shared/Spinner';
import { Icon } from '@/components/icons/Icon';
import styles from './SetupToolbar.module.css';

const CELLS: readonly { st: CapStatus; glyph: string; word: string }[] = [
  { st: 'available', glyph: '✓', word: 'available' },
  { st: 'unavailable', glyph: '✕', word: 'unavailable' },
  { st: 'unknown', glyph: '?', word: 'unknown' },
];

/**
 * What the group menu says of a group. The one on screen says what the status bar says (`doctorNever`); the home group
 * not on screen kept its rows (probed); any other group not on screen restarts as never probed when picked again.
 */
export const groupNote = (s: SetupState, g: string): 'probed' | 'never probed' =>
  (g === s.group ? !s.doctorNever : g === s.homeGroup) ? 'probed' : 'never probed';

/** Toolbar: the GitLab group menu, the belay doctor lozenge (it lights matching capabilities), Re-probe. */
export function SetupToolbar() {
  const { state, view, actions } = useSetup();
  const menu = useMenu();
  const counts = doctorCounts(state);
  // Live: the paired group only. The demo's second group is a fixture, never offered against a real one.
  const groups = state.live ? [state.homeGroup] : [state.homeGroup, OTHER_GROUP.name];
  return (
    <>
      <PopupButton
        icon="folder"
        title="GitLab group"
        expanded={menu.isOpen}
        onClick={(e) => {
          if (menu.isOpen) menu.close();
          else {
            menu.openFrom(e.currentTarget, {
              items: [
                { head: 'GitLab group' },
                ...groups.map((g) => ({
                  label: g,
                  checked: state.group === g,
                  sc: groupNote(state, g),
                  run: () => {
                    actions.pickGroup(g);
                    view.clear();
                  },
                })),
              ],
            });
          }
        }}
      >
        {state.group}
      </PopupButton>
      {menu.menu}
      <Spacer />
      <Lozenge label="belay doctor">
        {CELLS.map((c, i) => (
          <span key={c.st} className={styles.cell}>
            {i > 0 ? <LozengeDivider /> : null}
            <LozengeButton
              lead={<span className={`${styles.glyph} ${styles[c.st] ?? ''}`}>{c.glyph}</span>}
              count={counts[c.st]}
              word={c.word}
              pressed={view.capFilter === c.st}
              title={`Light ${c.word} capabilities and what they reach`}
              onClick={() => view.toggleFilter(c.st)}
            />
          </span>
        ))}
      </Lozenge>
      <Spacer />
      <ToolbarButton className={styles.probe} disabled={state.doctorBusy} title="Re-probe the group with belay doctor" onClick={() => void actions.reprobe()}>
        {state.doctorBusy ? (
          <Spinner />
        ) : (
          <Icon name="probe" />
        )}
        <span>{state.doctorBusy ? 'Probing…' : 'Re-probe'}</span>
      </ToolbarButton>
    </>
  );
}
