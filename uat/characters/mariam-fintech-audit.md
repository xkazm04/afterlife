---
name: Mariam (fintech audit lead)
role: Engineering Lead for the regulated core-banking projects (~80 engineers, Java and Scala); owns change-management evidence and the pack auditors and the regulator read each quarter
maps_to: /task/[id] (the receipt chain, the engine version, a replay re-derived from the ledger), /ladder (every tier change with who made it, when and on what evidence), /theater (a recorded ledger slice replayed, always marked REPLAY), /needs-you (what was decided this week, and the writes the outbox sent)
tech_level: power-user
promotion: discovery
references:
  - https://www.konfirmity.com/blog/soc-2-data-retention-guide - 2026 Trust Services Criteria. Logging should be tamper-evident, with a cryptographic hash and append-only storage, and Type II evidence kept for the observation window plus a buffer. Sets her bar that the agents' record must be hash-chained and kept long enough, in storage her company controls.
  - https://auditkit.dev/blog/soc-2-audit-log-requirements - the SOC 2 audit-log checklist. Every entry needs a precise timestamp, a unique id and integrity protection, in logs that resist tampering and are reviewed regularly. Sets her bar that a record an examiner reads must prove it was not altered, not just exist.
---

## Who they are
Mariam is the engineering lead for the core-banking projects at the payments company: about 80 engineers, a Java and Scala stack, and money-movement services under continuous examiner scrutiny. Each quarter she assembles the change-management evidence pack the auditors and the regulator read. Agents now open merge requests into her projects, and some action classes may soon merge without a person. Her question about Afterlife is one an examiner will ask her: when an agent merged a change into a money-moving service with no human approval, what checked it, who granted the agent that right, and can she prove the record has not been touched since?

## Background / lived experience
Mariam came up through platform and security engineering. She has been through two SOC 2 Type II audits and a regulatory examination, and has been burned by tools that looked like evidence and were not: a compliance dashboard whose export could not prove it had not been edited, and a bot merge approved by a service account that nobody could tie to a decision. She reads a tier change the way an examiner reads a control narrative: who decided, on what evidence, and where it is written down.

Her manual baseline is about two days per quarter: pulling merge request approvals, pipeline results and change tickets for every production change into one pack. An agent merge with no approval is, today, a gap in that pack. A Proof Block could close the gap, but only if it is re-derived by something deterministic, pinned to a version, and kept in a ledger that shows tampering. What is personally at stake: if she certifies the pack and an examiner pulls a thread and finds a mutable record or an unexplained grant, the finding has her name on it.

## Voice
Precise, with a control-narrative cadence, and allergic to "should". "Is it enforced, or is it a label?" "Who granted that agent hands-off, on what date, by which merge request?" "If I replay this next quarter, does it say the same thing, and can I prove nothing was touched?" "Re-derived, not re-run. Good. Now show me the hashes." On a vague claim: "That's a marketing string, not a control." Her grudging approval: "Fine. That I could put in front of an examiner."

## Jobs to be done
- "For any agent change merged without a person, show an examiner its Proof Block: the checks, the job or note each one read, the engine version and source hash that produced the verdict, and the commit."
- "Show that the tier the agent held at that moment came from a recorded decision: a promotion merge request merged by a named person, or a demotion by the tripwire with its trigger and evidence."
- "Prove the record wasn't altered: hash-chained events per project in a ledger that lives in our own GitLab, and a replay that re-derives the verdict from the ledger without re-running any agent."
- "Keep the money-moving projects inside the hands-off envelope, or out of hands-off entirely, and be able to show which."

## What "good" looks like (acceptance expectations)
Grounded in the tamper-evidence and retention bars in `references`:
- Task shows the seven-link receipt chain with its hashes, and links not reached are dashed as n/a, never drawn as complete. Replay re-derives the verdict from the ledger and says so; it never re-runs the agent.
- Every proof names the engine version and source hash that produced it, so the checker an examiner asks about is the checker that ran.
- Ladder's log gives each tier record its time, who or what set it, the reason, the evidence link, the lease expiry (a hands-off grant lapses to Supervised unless confirmed again) and any cooldown.
- An event Afterlife cannot attribute is shown as unattributed, never hidden or merged into another.
- Theater is always marked REPLAY and is never confused with live evidence.
- Needs you's "Decided this week" and the outbox's sent list say who clicked and which command ran.
- The ledger is a GitLab project inside the company's own group, so its retention follows their policy, not a vendor's.

## Pet peeves / friction triggers
- A tier change with no named person and no named trigger.
- A "replay" that re-runs a model, so the answer could differ the second time.
- Evidence that lives only in a vendor's database instead of their own GitLab.
- A mutable log, or a chain that cannot detect an edited event.
- A service account's approval presented as a human's.
- A recorded replay that could be mistaken for live data.
