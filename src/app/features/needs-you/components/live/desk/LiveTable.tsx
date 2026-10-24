import type { KeyboardEventHandler, Ref } from 'react';
import { Button } from '@/components/controls/Button';
import { NeedsYouBadge } from '@/components/status/NeedsYouBadge';
import { HonestyChip } from '@/components/status/chip/HonestyChip';
import { Cell } from '@/components/table/Cell';
import { GroupRow } from '@/components/table/GroupRow';
import { HeaderCell } from '@/components/table/HeaderCell';
import { minWidth, range } from '@/components/table/model/columns';
import { groupNavId, rowDomId } from '@/components/table/model/rowNavigation';
import { OutlineTable } from '@/components/table/OutlineTable';
import { Row } from '@/components/table/Row';
import { RowGroup } from '@/components/table/RowGroup';
import { canStage, readOnlyName, type DeskGroup, type DeskItem, type DeskOut } from '../../../model/desk';
import { shortAge } from '../../../model/clock/age';
import type { MoveView } from '../../../model/rows/rowData';
import type { GlyphKind } from '../../../model/rows/rowState';
import { DecisionGlyph } from '../../shared/DecisionGlyph';
import { MoveCell } from '../../table/MoveCell';
import table from '../../table/table.module.css';
import styles from './desk.module.css';

const COLUMNS = [range(220, 4000), range(110, 130), range(100, 110), range(52, 60), range(76, 84)].join(' ');

/** A row waits for a person until it is decided, sent, or staged for Run all: only a waiting row is drawn amber. */
export const waits = (n: DeskItem, out: DeskOut, sent: readonly string[]): boolean =>
  n.kind !== 'decided' && !sent.includes(n.id) && !out.order.includes(n.id);

/** The row's state glyph and its words: waiting (amber), staged, done or unknown (refused, failed). */
export function rowGlyph(n: DeskItem, out: DeskOut, sent: readonly string[]): { kind: GlyphKind; word: string } {
  if (n.kind === 'decided') return { kind: 'ok', word: 'decided' };
  if (sent.includes(n.id) || out.result[n.id]?.state === 'done') return { kind: 'ok', word: 'sent' };
  const r = out.result[n.id]?.state;
  if (r === 'refused' || r === 'failed') return { kind: 'unk', word: r };
  if (r) return { kind: 'stg', word: r === 'running' ? 'running' : 'staged' };
  return { kind: 'wait', word: 'waits for you' };
}

/** What moves: a tier, a rung (an unknown rung now is "?", never R0), or what kind of row it is. */
export function moveOf(n: DeskItem): MoveView {
  const s = n.source;
  if (n.kind === 'decided') return { kind: 'chip', label: 'decided', tone: 'ok' };
  if (n.kind === 'readmit') return { kind: 'tiers', from: 'quarantined', to: 'assisted' };
  if (n.kind === 'promote') return s?.from && s.to ? { kind: 'tiers', from: s.from, to: s.to } : { kind: 'chip', label: '?', tone: 'unknown', title: 'The tiers are not stated' };
  if (n.kind === 'gap' && typeof s?.rungTo === 'number') {
    return typeof s.rungFrom === 'number' ? { kind: 'rungs', from: s.rungFrom, to: s.rungTo } : { kind: 'chip', label: `R? → R${s.rungTo}`, tone: 'unknown', title: 'The rung now is unknown' };
  }
  return { kind: 'chip', label: n.kind === 'gap' ? 'gap' : (readOnlyName(s?.kind) ?? 'read-only'), tone: 'plain' };
}

/** When: a deadline on a waiting row, else how long it has waited (or since it was decided); unknown says so. */
function When({ n, waiting, now }: { n: DeskItem; waiting: boolean; now: Date }) {
  const due = n.source?.dueIn;
  if (due) return <span className={`${table.mono} ${waiting ? table.due : table.when}`}>{due}</span>;
  const age = shortAge(n.kind === 'decided' ? n.actedAt : n.openedAt, now);
  if (age) return <span className={`${table.mono} ${table.when}`}>{age}</span>;
  return (
    <span title={n.kind === 'decided' ? 'When it was decided is unknown' : 'When it started waiting is unknown'}>
      <HonestyChip kind="unknown">?</HonestyChip>
    </span>
  );
}

export interface LiveTableProps {
  groups: readonly DeskGroup[];
  shut: readonly string[];
  sel: string | null;
  out: DeskOut;
  /** Ids sent this session (done): no longer waiting. */
  sent: readonly string[];
  now: Date;
  tableRef: Ref<HTMLDivElement>;
  onKeyDown: KeyboardEventHandler<HTMLDivElement>;
  onSelect: (id: string) => void;
  onToggleGroup: (id: string) => void;
  onActivate: (id: string) => void;
  onStage: (id: string) => void;
}

/** The desk's rows in groups (By kind / By project / By deadline, "Decided this week" last): glyph, title, project, move, when, Stage. */
export function LiveTable(p: LiveTableProps) {
  const { out, sent } = p;
  return (
    <OutlineTable label="Decisions" columns={COLUMNS} minWidth={minWidth(600)} activeId={p.sel ? rowDomId(p.sel) : undefined} tableRef={p.tableRef} onKeyDown={p.onKeyDown} stickyEnd
      header={
        <>
          <HeaderCell>Decision</HeaderCell>
          <HeaderCell tip="The project the proposal is for">Project</HeaderCell>
          <HeaderCell tip="What moves: tier or rung">Move</HeaderCell>
          <HeaderCell align="end" tip="A deadline, or how long it has waited">When</HeaderCell>
          <HeaderCell tip="Stage it for Run all" />
        </>
      }
    >
      {p.groups.length === 0 ? (
        <div className={styles.empty} role="row">
          <div role="gridcell">No decisions</div>
        </div>
      ) : null}
      {p.groups.map((g) => {
        const open = !p.shut.includes(g.id);
        const waiting = g.items.filter((n) => waits(n, out, sent)).length;
        return (
          <RowGroup key={g.id}>
            <GroupRow id={g.id} label={g.name} count={g.items.length} expanded={open} selected={p.sel === groupNavId(g.id)} onSelect={p.onSelect} onToggle={p.onToggleGroup}>
              <Cell />
              <Cell />
              <Cell />
              <Cell>{waiting ? <NeedsYouBadge count={waiting} variant="group" title={`${waiting} waiting for you`} /> : null}</Cell>
            </GroupRow>
            {open
              ? g.items.map((n, i) => {
                  const glyph = rowGlyph(n, out, sent);
                  const staged = out.order.includes(n.id);
                  return (
                    <Row key={n.id} id={n.id} alt={i % 2 === 1} selected={p.sel === n.id} onSelect={p.onSelect} onActivate={p.onActivate}>
                      <Cell indent className={styles.lead}>
                        <span title={glyph.word} aria-label={glyph.word} role="img">
                          <DecisionGlyph kind={glyph.kind} />
                        </span>
                        <span className={`${styles.nm} ${n.kind === 'decided' ? styles.dim : ''}`} title={n.title}>
                          {n.title}
                        </span>
                      </Cell>
                      <Cell>
                        <span className={`${styles.nm} ${styles.mono}`} title={n.project}>{n.project}</span>
                      </Cell>
                      <Cell>
                        <MoveCell move={moveOf(n)} />
                      </Cell>
                      <Cell align="end">
                        <When n={n} waiting={glyph.kind === 'wait'} now={p.now} />
                      </Cell>
                      <Cell align="end" className={styles.act}>
                        {canStage(n) && glyph.word !== 'sent' ? (
                          <Button size="mini" variant={staged ? 'ghost' : 'accent'} tabIndex={-1} disabled={out.running} aria-label={`${staged ? 'Unstage' : 'Stage'}: ${n.title}`} onClick={() => p.onStage(n.id)}>
                            {staged ? 'Unstage' : 'Stage'}
                          </Button>
                        ) : null}
                      </Cell>
                    </Row>
                  );
                })
              : null}
          </RowGroup>
        );
      })}
    </OutlineTable>
  );
}
