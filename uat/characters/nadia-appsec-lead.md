---
name: Nadia (AppSec Lead)
role: Application Security Lead (owns vulnerability response, supply-chain risk and the secure-SDLC evidence for the company's GitLab group; a Code Owner on the trust policy for the security action classes)
maps_to: /task/[id] (the patcher's claims against the engine's checks, the exploit test red at base and green at head, the guardrail's quoted hunks), /ladder (what the patcher and the guardrail may do alone, and the record behind each tier), /needs-you (promotions of security action classes before they are signed), /fleet (which projects run the patcher and the guardrail, and what they proved this week)
tech_level: power-user
promotion: discovery
references:
  - https://snyk.io/articles/slopsquatting-mitigation-strategies/ - slopsquatting, or package hallucination. An analysis of 576k AI-generated samples found about 20% recommended packages that do not exist, and attackers register the hallucinated names. Sets why an agent that writes dependency patches is exactly where she expects a fake package to get in, and why a patch must be proven, not just merged.
  - https://www.konfirmity.com/blog/soc-2-secure-sdlc - SOC 2 secure-SDLC and change-management evidence. CC6.1 and CC8.1 expect code changes to be reviewed and approved before deploy and backed by timestamped, attributable artifacts; a policy that exists is not enough. Sets her bar that a hands-off merge still needs evidence that something checked it.
  - https://docs.gitlab.com/user/project/codeowners/ - Code Owners can be required to approve merge requests that change their files, when the target branch is protected and Code Owner approval is enabled. Sets how she expects a promotion of a security class to reach her before it lands.
---

## Who they are
Nadia leads Application Security at the same ~500-engineer payments company, which is mid-way through a SOC 2 Type II observation window and runs SAST, secret detection and dependency scanning in every merge request pipeline. Priya is arming two tracks that touch her world: the exploit-proof patcher, which opens dependency and code fixes for findings, and the guardrail reviewer, which reviews agent merge requests and blocks them with a quoted hunk. Nadia does not run Afterlife. She asked to be a Code Owner on the trust policy for the security classes, so no patcher class goes hands-off without her reading its record. Her question is simple: when an agent says it fixed a vulnerability, what proves it, and whose name is on it if it didn't?

## Background / lived experience
Nadia came up through penetration testing and DevSecOps before moving into AppSec leadership. She has been burned by every flavour of security theatre: a scanner that buried the team in 4,000 "criticals" that were all unreachable transitive dependencies; an auto-fix bot whose "fixed" merge requests bumped a version without ever closing the finding, so the vulnerability report still listed it a month later; a review bot that confidently cited a line that was not in the diff. She has read the slopsquatting research and knows an agent writing lockfile changes is the easiest place for a hallucinated package to slip in.

Her recurring nightmare is the audit evidence pull: walking merge requests, approvals and pipeline results by hand into a spreadsheet to show that every change to a production service was checked before deploy. A merge with no human approval is, to her, a hole in that story unless something machine-checkable stands in for the human. She answers to the CISO and, indirectly, to the auditor; she is the one who signed the control attestation.

## Voice
Precise, risk-framed, dry. She talks in controls and evidence: "Don't tell me it's fixed, show me the test that was red at base." "A claim is not a check." "Did the finding close on the rescan, or did the agent just say so?" "A reviewer that can't quote the hunk didn't read the diff." "If the engine couldn't decide, that's inconclusive. It is not a pass." She respects honest scope: "If the proof is a stub today, say stub." When something holds she relaxes into auditor-speak: "Okay, that goes in the evidence binder."

## Jobs to be done
- "Open any patcher task and see in a minute whether the fix is real: the exploit test red at base and green at head, the same test id both times, the finding closed on the rescan, the diff inside its envelope, and each check linked to the job or note it read."
- "Know which security classes may merge alone (`dep-bump.patch`) and which never may (`code-fix.patch` stops at Supervised), and read the record behind a tier before a promotion lands in Needs you."
- "Use the Proof Blocks and the ledger as secure-SDLC evidence: an attributable record that every agent change was checked before merge, by a checker pinned to a version."
- "See the guardrail block with a quoted hunk, never a feeling, and see an agent that touches CI config or CODEOWNERS fail its envelope."

## What "good" looks like (acceptance expectations)
Grounded in the AI supply-chain research and the SOC 2 change-management bar in `references`:
- Task keeps claims and checks apart. The agent's claims and words are untrusted and rendered as plain text; only the engine's checks make the verdict. One false check fails it, an undetermined check makes it inconclusive, and a check a person must decide is struck, never counted as a pass.
- An exploit-test proof shows its checks (red at base, green at head, same test id, finding closed on rescan) and the engine version and source hash that produced the verdict.
- A `dep-bump.patch` diff may touch only manifests, lockfiles and tests. A single changed `.gitlab-ci.yml`, `.gitlab/` file or CODEOWNERS fails the envelope, and the screen says which path broke it.
- A guardrail block on an agent merge request cites a hunk that exists in the diff at the current head (the seeded hidden instruction on !44, quoted and labelled seeded), and a high-severity block drops that agent's class to Quarantined.
- Ladder shows the ceiling of every security class, so no record can promote `code-fix.patch` past Supervised.
- A Proof Block made for an older head is never shown as the merge request's proof.
- Illustrative data and seeded faults are labelled as such everywhere she might copy them from.

## Pet peeves / friction triggers
- "Fixed" meaning "version bumped", with no rescan behind it.
- A green verdict with an undecided check inside it.
- Agent prose rendered as if it were trusted: live links, formatted instructions, anything a prompt injection could use.
- A reviewer finding with no quote, or a quote that isn't in the diff.
- Theatre counts such as "37 vulnerabilities auto-remediated" with no per-finding proof behind them.
- A hands-off class whose envelope lets it touch CI config.
- Demo numbers that aren't labelled; she will never attest to a fabricated count.
