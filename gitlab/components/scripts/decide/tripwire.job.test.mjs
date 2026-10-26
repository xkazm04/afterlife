import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { SCRIPTS } from '../testing/harness.mjs';

// The tripwire is no longer a component of the target's pipeline (F4): belay-apply runs it, in sweep mode, from its own
// protected default branch, never in a merge request pipeline. gitlab/apply/test/tripwire-sweep.test.mjs runs it end to end.
describe("belay-apply's tripwire job", () => {
  const ci = fs.readFileSync(path.join(SCRIPTS, '..', '..', 'apply', '.gitlab-ci.yml'), 'utf8');

  it('runs tripwire-sweep.mjs, only on the protected default branch, never for a merge request', () => {
    expect(ci).toMatch(/^belay-apply-tripwire:\n(?: {2}.*\n)*? {4}- node "\$AFTERLIFE_DIR\/gitlab\/apply\/tripwire-sweep\.mjs"/m);
    expect(ci).toContain('$CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH && $CI_COMMIT_REF_PROTECTED == "true"');
    expect(ci).not.toMatch(/merge_request/);
    expect(fs.existsSync(path.join(SCRIPTS, '..', 'templates', 'tripwire'))).toBe(false);
  });
});
