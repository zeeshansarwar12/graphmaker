# Automation operations — pilot in progress

Canonical task: https://github.com/zeeshansarwar12/graphmaker/issues/5

## Release boundary

Work on a dedicated feature branch and draft pull request. Do not merge, enable auto-merge, deploy production, or change Cloudflare settings, secrets, permissions or branch protections without explicit owner approval. Existing preview integrations may run; preview availability must be verified from actual commit checks.

## Handoff verification

The PM's current integration can read and write GitHub issues and pull requests, but exposes no direct Codex Cloud task-launch operation. Official documentation describes a non-review `@codex` comment on a pull request as a supported cloud-task trigger: https://learn.chatgpt.com/docs/third-party/github

This draft is a minimal context carrier for that trigger. A posted comment is only a dispatch attempt. Require a bot acknowledgement/task link, implementation commits, CI evidence and PM review before claiming a working loop. No end-to-end automation has been demonstrated yet.

## Implementation pending

Codex must inspect Issue #5, AGENTS.md, the relevant repository documents and actual workflows, then complete the issue's scoped operations documentation and evidence reporting. This seed document is not a completed audit. Tests, branch protection, preview deployment and production status have not been certified by this document.
