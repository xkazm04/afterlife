'use client';

// The Monitor's regions before the fleet is read (the screen host's core slice): the same boxes the read screen draws,
// so nothing moves when it lands, with an em dash for every value. Never a zero: an unread count is unknown. The big
// number is a dash in quiet ink, not amber: nothing is known to wait yet.
import { InspectorHeader } from '@/components/inspector/InspectorHeader';
import { Unread } from '@/components/shell/host';
import answer from './answer/answer.module.css';
import leads from './leads/leads.module.css';

export function AnswerPending() {
  return (
    <div className={answer.band}>
      <div className={answer.answer}>
        <span className={`${answer.big} ${answer.bigUnread}`}>
          <Unread label="decisions waiting: not read yet" />
        </span>
        <span className={answer.words}>
          <span className={answer.head}>decisions wait for you</span>
          <span className={answer.who}>
            <Unread label="projects not read yet" />
          </span>
        </span>
      </div>
      <div className={answer.readout}>
        <span className={answer.roName}>
          <Unread label="group not read yet" />
        </span>
        <span className={answer.roLine}>
          <Unread /> leads · <Unread /> projects
        </span>
      </div>
    </div>
  );
}

/** The leads' box, empty until the fleet lands (its rows come with it): the band above keeps its place. */
export function LeadsPending() {
  return <div className={leads.leads} role="group" aria-label="Leads, one per group" aria-busy="true" />;
}

export function InspectorPending() {
  return <InspectorHeader title={<Unread label="group not read yet" />} sub="Reading the fleet" />;
}

export function StatusPending() {
  return (
    <>
      <Unread /> projects on <Unread /> leads · <Unread label="decisions not read yet" /> · <Unread label="poll age not read yet" />
    </>
  );
}

/** The fleet could not be read: why (a fixed reason from the server, e.g. live before its first poll). */
export function CoreUnreadable({ reason }: { reason: string }) {
  return (
    <div className={leads.leads} role="status">
      <div className={leads.empty}>The fleet could not be read: {reason}</div>
    </div>
  );
}
