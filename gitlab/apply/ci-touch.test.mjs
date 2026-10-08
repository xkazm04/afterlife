// touchesCi decides whether an MR controls the jobs that made its evidence. An include it cannot resolve from the head's
// files alone (a path with a variable, a wildcard whose matches are not followed) fails closed: it counts as touching CI (F68).
import { describe, expect, it } from 'vitest';
import { touchesCi } from './ci-touch.mjs';

const project = { path_with_namespace: 'acme/app', ci_config_path: null };
const touches = (ci, changed = ['src/app.kt'], files = {}) => touchesCi({ changed, project, readAt: (p) => ({ '.gitlab-ci.yml': ci, ...files })[p] ?? null });

describe('touchesCi (F68)', () => {
  it('a local include without a variable or wildcard is followed, and an MR that does not touch it passes', () => {
    expect(touches('include:\n  - local: /ci/replay.yml\n', ['src/app.kt'], { 'ci/replay.yml': 'job:\n  script: x\n' })).toBeNull();
  });

  it('an include path that carries a variable counts as touching CI', () => {
    for (const ci of [
      'include:\n  - local: /ci/$CI_COMMIT_REF_SLUG.yml\n',
      'include:\n  - local: "/ci/${BELAY_CI}.yml"\n',
      'include: "ci/$FILE.yml"\n',
      'include:\n  - project: acme/app\n    file: /ci/$FILE.yml\n',
      'include:\n  - project: $CI_PROJECT_PATH\n    file: /ci/replay.yml\n',
    ]) expect(touches(ci), ci).toMatch(/variable/);
  });

  it('a wildcard include counts as touching CI, even when the MR changes none of its matches', () => {
    for (const ci of ['include: "ci/*.yml"\n', 'include:\n  - local: /ci/**/*.yml\n', 'include:\n  - project: acme/app\n    file: ci/*.yml\n']) {
      expect(touches(ci), ci).toMatch(/wildcard/);
    }
  });
});
