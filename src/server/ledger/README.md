# src/server/ledger - ledger import (module B6)

`belay-ledger/events/<project-id>.jsonl` (GitLab, the source of truth) -> `ledger_event` (the index, a cache of it).
Server-only through `index.ts`; the parts are plain functions.

| Part | What it is |
|---|---|
| `parse.ts` | `parseLedgerJsonl(text)`: one `LedgerEvent` per line, every field checked; a bad line throws `LedgerParseError` with its number. `verdict` (`pass` or `block`) is kept on a `guardrail_verdict` and refused on any other kind or with any other value; an event without one keeps no `verdict` key |
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

## The guardrail's verdict

A `guardrail_verdict` event states what the guardrail said: `verdict: 'pass' | 'block'`
(`gitlab/components/scripts/decide/apply-gate.mjs` writes it from the guardrail file it read). An event written before
the gate stated it has no `verdict` key. The key is absent, never `null`, at every step (the engine's
`parseLedgerEvent`, `parse.ts`, the index's `readLedger`), because `canonical()` in `src/schemas/ledger.ts` would hash a
`null`, and every chain written before the field would stop verifying. An explicit `undefined` hashes as absent, as
`JSON.stringify` writes it (`canonical()` skips it). A forced gate also writes one, `verdict: 'block'`, when the guardrail
itself blocked the head (`gitlab/apply/README.md`). The index stores it in `ledger_event.verdict`
(migration 0008: `pass`, `block` or null, and null on any kind but `guardrail_verdict`).

A `deployed` event may state its `environment`: `{ name, tier }`, the tier being GitLab's deployment tier (`production`,
`staging`, `testing`, `development`, `other`). It is kept on a `deployed` event only and is absent, never `null`, at every
step, for the same reason as `verdict`. The index stores it in `ledger_event.environment` (migration 0010). Theater reads
the tier: staging reaches hold 7, production hold 8. Tests: `__tests__/environment.test.ts`.

Tests: `__tests__/ledger.test.ts` (full import, incremental append, blob-id skip, edited event, fork, rewind, foreign
project, parser); `__tests__/verdict.test.ts` (the verdict: kept, refused, covered by the hash, and a chain without
verdicts hashing exactly as main computed it, through parse, `appendLedgerEvents` and `readLedger`). Not verified live: the real `listTree`/`getFile` shapes (recorded nowhere yet; the fake serves `[R]` ones).
