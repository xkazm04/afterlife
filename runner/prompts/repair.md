<!-- vendored from ascent@332c702fe28ba5a59519f84f61c2c09a16a482f7 (refs/hygiene-archive/2026-10-20/experiment/infinite-cycles, cycles personas-web-006 f6994190 and -007 332c702f): src/lib/local/lane-review.ts (buildReviewRepairPrompt, integrityFinding) -->
# Belay - REPAIR - one turn after the review

An independent read-only reviewer read your uncommitted change against the checks this repository runs and the rules of your brief, and reports the defects below. Nothing has been committed or run by the runner yet.

Fix each one in place, then stop:
- Fix the code, the document, or your NEW test's own assertion so that it states something true. Do not weaken, skip, delete or edit an EXISTING test or check: that voids the lane.
- An `[integrity]` finding is already undone: the runner put that EXISTING test file or fixture back to its text at your base, because changing it beyond a mechanical call-site update voids the lane. Leave it exactly as it is now. If your item needs assertions you had written there, put them in a NEW test file at a path that does not exist yet: Glob the path before you Write, because Write replaces an existing file without a warning. Then run that new test.
- Touch only what these findings need.
- If a finding is wrong (the declaration or the file says otherwise), leave the code and say why in one line.
- If the item cannot be made to pass, end with PARK and say why.
- You may run the same commands as before (the formatter, the tests of the files you touched, the typecheck). Run the ones these fixes touch.

Then end your reply with the lane's last line again, exactly ONE plain line: `DONE: <what changed, the evidence it works>` or `PARK: <reason>`. The runner reads this line, not your earlier one.
