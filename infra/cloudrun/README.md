# Google Cloud deployment (DECISIONS.md D5)

- **Demo bank** (`ledgerline`, its own repo): review apps per MR, `staging` and `production`
  services on Cloud Run, deployed by the pipeline with OIDC (Workload Identity Federation), no
  stored keys. Terraform state managed by GitLab, which also covers the Configure stage.
- **Belay hosted replay**: this app's standalone build with `BELAY_MODE=replay`, serving a ledger
  snapshot read-only, with no tokens and no write path. It is the public live link for judges and
  must stay up until about 16 November.

The Terraform lands in week 2. The deployment code must be in the public repo for the +0.2 bonus.
