---
name: Klaus (embedded firmware lead)
role: Engineering Lead, embedded firmware (25 engineers, C, C++ and Rust for the card terminals the company sells in the EU; the named person for its CRA vulnerability reports)
maps_to: /needs-you (the CRA band with its countdown, the evidence count and the sign-off), /task/[id] (each draft statement set against the GitLab object it links), /setup (why the CRA track stays locked until the SBOM job exists)
tech_level: power-user
promotion: discovery
references:
  - https://digital-strategy.ec.europa.eu/en/policies/cra-reporting - the European Commission's CRA reporting obligations. Since 11 September 2026 manufacturers must report actively exploited vulnerabilities and severe incidents through the CRA Single Reporting Platform, with an early warning within 24 hours of becoming aware, a notification within 72 hours, and a final report 14 days after a corrective measure is available (one month after the notification for a severe incident). Sets the clock he expects Afterlife to show to the minute.
  - https://digital-strategy.ec.europa.eu/en/policies/cyber-resilience-act - the Cyber Resilience Act overview, which links the legal text he reconciles every deadline against. Sets that the obligations are law, not guidance, and that the manufacturer is accountable for them.
  - https://www.embedded.com/the-impact-of-ai-ml-on-qualifying-safety-critical-software/ - in qualified, safety-critical software, AI cannot operate autonomously where a defect does harm, and a person in the loop is the requirement rather than a gap. Sets his insistence that software may draft a legal report but a person submits it.
---

## Who they are
Klaus leads the 25-engineer firmware group that builds the card terminals the payments company sells across the EU. His projects live in their own GitLab subgroup and change slowly by design: a few releases a quarter, each formally reviewed. Under the Cyber Resilience Act the terminals are products with digital elements, and since 11 September 2026 the company must report any actively exploited vulnerability in them on a legal clock. Klaus is the named person on those reports. Priya can arm the CRA track for his subgroup; what Klaus needs from it is a draft he can sign and a clock he can trust, at 3am on a Saturday if that is when awareness starts.

## Background / lived experience
Klaus has spent twenty years close to the metal: board bring-up, drivers, RTOS work, bootloaders, a Rust rewrite after a memory bug nearly shipped. His world runs on coding standards, static analysis, hardware-in-the-loop rigs and certification audits where traceability is law and "move fast" is a liability. He has been pitched productivity tools that read his deliberate cadence as underperformance, and he distrusts any metric that cannot tell "stable and correct" from "abandoned".

The CRA changed his weekends. His first tabletop drill went badly: nobody could agree when the company had become "aware", the SBOM for the affected release was a spreadsheet, and the draft early warning cited a fix merge request that turned out to be for a different branch. He would welcome help with the drafting, because pulling the vulnerability, the fix, the SBOM and the release notes into one statement under a 24-hour clock is exactly where tired people make mistakes. But he will not let any software submit a legal report. What is personally at stake: his name is on the submission, and a wrong statement or a missed deadline is a regulatory matter, not a bug.

## Voice
Precise, dry, allergic to hype; he speaks in invariants and edge cases. "When did the clock start, and who decided we were aware?" "Nineteen hours twelve minutes to what, exactly: the early warning or the notification?" "Every sentence in that draft points at something, or it comes out." "The software drafts. I sign. The platform hears it from a person." "If it's a drill, it says DRILL on every line." His praise is grudging and specific: "Fine. Every link resolved, and it told me which deadline it was counting to."

## Jobs to be done
- "When a vulnerability in terminal firmware is reported as actively exploited, see the CRA clock start from the awareness time, with each deadline named: early warning at 24 hours, notification at 72 hours, final report 14 days after the fix is available."
- "Get a draft in which every statement links to a GitLab object that resolves (the vulnerability, the fix merge request, the SBOM artifact, the release), so my review is reading, not research."
- "Sign off in Needs you knowing exactly what the click does: it marks the packet ready to sign, and a person submits on the Single Reporting Platform. Afterlife never submits."
- "Know before an incident that the CRA track is really armed for my subgroup, and if it is locked, what is missing."

## What "good" looks like (acceptance expectations)
Grounded in the Commission's reporting obligations and the human-in-the-loop bar in `references`:
- The CRA band on Needs you shows a live countdown that names the deadline it counts to, the 24-hour rail, the evidence count (links resolved out of links cited) and a grade ladder in which "attested" stays struck until a person attests.
- The awareness time behind the clock is visible, together with who set it. That the clock starts at awareness is an assumption, and it is shown as one.
- Each draft statement carries a linked-evidence proof: it links to a GitLab object that resolved by API. An unresolved link blocks the draft instead of being shown as fine.
- Ladder shows `report.submit` as human only, so no record and no promotion can ever let an agent submit; drafting may be hands-off.
- A drill clock says drill everywhere it appears, so nobody mistakes it for a live obligation, and nobody submits a drill.
- Setup shows the CRA track locked with its reason ("needs the SBOM job") until that job exists in the pipeline.
- The firmware subgroup's slow cadence is never presented as a problem.

## Pet peeves / friction triggers
- Any path, however indirect, to automatic submission.
- A countdown with no named deadline, or no clear time zone.
- Draft prose with statements not linked to evidence, or links that don't resolve.
- A drill that looks like a real clock.
- Velocity framing on a deliberately slow subgroup ("only three merge requests this month").
- Being asked to trust a model's summary of a vulnerability over the issue itself.
