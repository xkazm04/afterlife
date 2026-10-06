# src/server/ledger - ledger import (module B6)

`belay-ledger/events/<project-id>.jsonl` (GitLab, the source of truth) -> `ledger_event` (the index, a cache of it).
Server-only through `index.ts`; the parts are plain functions.

| Part | What it is |
|---|---|
| `parse.ts` | `parseLedgerJsonl(text)`: one `LedgerEvent` per line, every field checked; a bad line throws `LedgerParseError` with its number |
| `importLedger.ts` | `importLedger({port, project, ref}, db, gitlabProjectId, blobCache)` |

## What `importLedger` does

1. `listTree` on `events/` finds `<project-id>.jsonl`; no file is `absent` (not an error: a new project has no ledger).
2. If the index already holds a tail for the project and the file's blob id is the one imported last time, it stops
   (`unchanged`): an idle ledger costs one tree listing.
3. `getFile`, parse, then **verify the whole file from genesis** (`verifyChain`). The file must hold only this project's
   events and must not be shorter than what is stored (a rewound ledger).
4. `appendLedgerEvents` is given the events from the stored tail onward, the tail included: an identical event is skipped,
   a different event at a stored seq is a fork and is rejected. All in one transaction.

A rejected ledger throws `LedgerChainError` (`brokenAtSeq`) and writes nothing: the index keeps the chain it had. The
poller turns that into a failed feed for the project (the rest of the poll still lands), so a tampered ledger is visible.

Tests: `__tests__/ledger.test.ts` (full import, incremental append, blob-id skip, edited event, fork, rewind, foreign
project, parser). Not verified live: the real `listTree`/`getFile` shapes (recorded nowhere yet; the fake serves `[R]` ones).
