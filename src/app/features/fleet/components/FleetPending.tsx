'use client';

// Fleet's parts before the fleet is read (the screen host's core slice): the status line and the table's one line, in
// the places the read screen draws them, with a dash for every value. Never a zero: an unread count is unknown.
import { Unread } from '@/components/shell/host';

/** "— projects · 2 filters · polled —": the filters are the URL's, so they are known; the rest is not read yet. */
export function FleetStatusPending({ filters }: { filters: number }) {
  return (
    <>
      <Unread label="projects not read yet" /> projects · {filters} {filters === 1 ? 'filter' : 'filters'} · polled <Unread label="poll age not read yet" />
    </>
  );
}

/** The table's line: a dash while the fleet is read, or why it could not be read. */
export function TablePending({ reason }: { reason?: string }) {
  return reason ? <>The fleet could not be read: {reason}</> : <Unread label="projects not read yet" />;
}
