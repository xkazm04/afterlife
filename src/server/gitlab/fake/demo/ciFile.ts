// ledgerline's .gitlab-ci.yml in the demo group: the target pipeline of gitlab/examples/target-project, shortened, with T4
// (guardrail) armed the way Setup's arm MR adds it (src/server/actions/arm), because the demo has T4 armed. Nothing in the
// poller reads it; Setup's arm, disarm and verify plan against it.
import { GROUP_PATH } from './ids';

export const LEDGERLINE_CI = `stages: [build, test, review, deploy]

workflow:
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"
    - if: $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH
    - if: $CI_PIPELINE_SOURCE =~ /^(schedule|api|trigger)$/

include:
  # belay:arm T4 guardrail begin e4333f76d69d
  - component: $CI_SERVER_FQDN/${GROUP_PATH}/belay-pack/proof-engine@1.0.0
    inputs:
      class: cited-diff
      engine_ref: v0.1.0
      stage: review
  # belay:arm T4 guardrail end
  - template: Jobs/SAST.gitlab-ci.yml
  - template: Jobs/Dependency-Scanning.gitlab-ci.yml
  - template: Jobs/Secret-Detection.gitlab-ci.yml

build:
  stage: build
  image: gradle:8-jdk21
  script: ./gradlew assemble

test:
  stage: test
  image: gradle:8-jdk21
  script: ./gradlew test
  artifacts:
    reports: { junit: build/test-results/test/*.xml }
`;
