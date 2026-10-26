// The Task window's regions before the task is read (the screen stream's detail, ledger and page slices): the same boxes
// the read screen draws, so nothing moves when they land, with an em dash for every value. Never a zero, and never
// "unknown" or "no rows": those are readings, and this is no reading yet.
import { InspectorHeader } from '@/components/inspector/InspectorHeader';
import { Unread } from '@/components/shell/host';
import eq from '../equation/VerdictEquation.module.css';
import hd from '../header/TaskHeader.module.css';
import tabs from '../tabs/tabs.module.css';

/** The title block: the title, the tier chips' row and the crumb, each a dash. */
export function HeaderPending() {
  return (
    <div className={hd.hd} aria-busy="true">
      <h1 className={hd.h1}>
        <Unread label="task title not read yet" />
      </h1>
      <div className={hd.chips}>
        <span className={hd.tl}>then</span>
        <Unread label="tier not read yet" />
      </div>
      <div className={hd.crumb}>
        <Unread label="track not read yet" /> · <Unread label="merge request not read yet" /> · <Unread label="task id not read yet" />
      </div>
    </div>
  );
}

/** The verdict equation's box: the word, the left-hand side and the tally, each a dash; no term until the checks land. */
export function EquationPending() {
  return (
    <section className={eq.eq} role="group" aria-label="Verdict" aria-busy="true">
      <div className={eq.v}>
        <Unread label="verdict not read yet" />
      </div>
      <div className={eq.f}>
        <span className={eq.lhs}>verdict =</span>
        <Unread label="checks not read yet" />
      </div>
      <div className={eq.tally}>
        <Unread label="tally not read yet" />
      </div>
    </section>
  );
}

/** The open tab's panel before the task lands: its box, empty (its cards or rows come with the task). */
export function PanePending() {
  return <div className={tabs.panelPending} aria-busy="true" />;
}

/** The Ledger tab before its slice lands: the two headings, a dash for each count. */
export function LedgerPending() {
  return (
    <div className={tabs.ledger} aria-busy="true">
      <section aria-label="Ledger">
        <h2 className={tabs.h}>
          Ledger
          <span className={tabs.aux}>
            <Unread label="rows not read yet" /> rows · reads only
          </span>
        </h2>
      </section>
      <section aria-label="trace.jsonl">
        <h2 className={tabs.h}>
          trace.jsonl
          <span className={tabs.aux}>
            <Unread label="flow run not read yet" />
          </span>
        </h2>
      </section>
    </div>
  );
}

export function InspectorPending() {
  return <InspectorHeader title={<Unread label="task not read yet" />} sub="Reading the task" />;
}

/** The status line before the docket and the page's facts are read. */
export function StatusPending() {
  return (
    <>
      <Unread label="tasks not read yet" /> tasks · <Unread label="fails not read yet" /> fail · ledger read <Unread label="poll age not read yet" /> · reads only
    </>
  );
}

/** The task could not be read: why (a fixed reason from the server, e.g. live before its first poll). */
export function DetailUnreadable({ reason }: { reason: string }) {
  return (
    <div className={eq.eq} role="status">
      <div className={eq.f}>The task could not be read: {reason}</div>
    </div>
  );
}
