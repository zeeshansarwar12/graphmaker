# Automation operations

GitHub issues, PRs, checks and run artifacts are the canonical task status.
Chat summaries are handoffs, not evidence that a check ran or a release happened.
This pilot uses the existing stack and authenticated Codex session, no OpenAI API,
new dependency, paid service, unattended dispatch, merge or deployment action.

## Operating loop

1. PM writes one scoped issue: read-first docs, observable acceptance criteria,
   exclusions, QA and report requirements. Owner starts a Codex task with its URL.
2. Codex reads AGENTS.md and relevant docs/implementation, checks the working tree,
   branches from current main as `codex/<task>`, and isolates unrelated local edits.
   Stop on a recorded decision conflict. Implement only the issue and its tests.
3. Run lint, typecheck, unit tests, relevant Playwright tests and production build.
   Commit, push the feature branch and open a **draft** PR linked with `Closes #N`.
   Fill the PR report template with actual commands and evidence; pending is valid.
4. GitHub Actions independently runs `Deployment checks`. Inspect the current head's
   run, not an older green run. Push and PR events can create separate runs.
   PR artifact QA tests GitHub's merge commit; preview QA checks out the head SHA.
5. Existing Cloudflare integration may create a preview from the push. The workflow
   only discovers a successful Cloudflare check for that exact head and immutable
   preview URL. It then audits deployed HTTP/HTML and runs browser tests without
   retries. Missing preview fails; never substitute another commit or production.
6. The `report` job runs after both jobs, including failure/skip, writing the run
   summary and `automation-report-<run_id>-<attempt>` artifact (JSON and Markdown).
   PM reads this plus logs, diff and acceptance criteria, then updates the PR report.
7. Owner reviews and explicitly approves any later merge/release. This setup PR
   stays draft and unmerged. A merge can trigger externally configured Cloudflare
   production publishing; CI success is not approval to merge or proof of live state.
   After a separately approved release, record merge SHA, deployed SHA/URL and HTTP
   verification before marking live deployed. Do not change production settings here.

Suggested owner-to-Codex handoff:

```text
Implement issue <URL>. Read AGENTS.md and relevant docs first. Use a dedicated
branch and draft PR. Run required QA and attach exact-SHA CI/preview evidence.
Report blockers and manual steps. Do not merge, deploy or modify production settings.
```

## Evidence contract

The JSON `schema_version: 1` report and matching Markdown record issue linkage,
base/head SHA, actual artifact and preview test checkout SHAs, changed files,
each required step's raw GitHub outcome, run/attempt URL, preview URL, blockers,
and separate code-completed/tested/preview-verified/merged/live-deployed states.
Push events may lack an issue link; manual runs lack a comparable base and are
blocked until reviewed with a PR run. PR file list is the base-to-head tree diff.
Code completion requires PM acceptance review. Live deployment is never inferred
from preview success. `html` and `http` cover repository-defined SEO/internal-link
and deployment assertions; they do not certify external links or search rankings.

Only all-success required steps and both successful jobs, identifiable test SHAs,
and the exact-head preview qualify for PM review. Failure, cancellation, skipped
jobs/steps and missing evidence produce `BLOCKED` and fail the report job. Artifact
upload failures also block. Logs are separate from reports: do not infer success
from a log's existence. Infrastructure failures before checkout/Python and force
cancellation may prevent report upload; missing report is itself a blocker.

Existing artifacts remain `deployment-verification-*` (logs, dist, audit, browser
report) and `preview-verification-*` (preview logs, audit, browser report).
All artifacts expire after 14 days. Preserve links and download evidence for longer
retention before expiry. After every commit, refresh QA and report for the new SHA.

## Verified integration and manual boundaries

On 2026-10-16 the authenticated GitHub connector read issue #5, branch metadata,
rulesets and exact-commit checks. Git fetch worked with authorized network access.
The local `gh` CLI is absent; use the connected GitHub tools or an authenticated CLI
where installed. No credentials need to be copied into scripts or issue bodies.

The supported pilot handoff is owner-started local Codex work and a manual return
of the PR/run links to the PM chat. A connected GitHub session can inspect/update
PRs when authorized. No GitHub-issue-to-Codex dispatcher, ChatGPT Plus account
entitlement, cross-chat notification or unattended execution has been validated
by this pilot. Never scrape browser/session credentials or treat issue comments
as executable commands. Official [Codex best practices](https://developers.openai.com/codex/learn/best-practices)
describe scoped tasks and repository guidance; available integrations still need
to be verified in the actual account. No claim that manual handoffs are impossible
to automate in every other setup is intended.

## Repository audit (2026-10-16)

- Baseline: main `d5013761379d88ad27b9a4c053e143e2f00f87b9`.
- One tracked workflow: `.github/workflows/deployment-check.yml`. Triggers are PR,
  pushes to main or codex/**, and workflow_dispatch. No deployment step or auto-merge.
- Permissions remain contents:read and checks:read. Checkout credentials are not
  persisted. No secrets, permissions, triggers, branch rules or Cloudflare settings
  are modified by this pilot. Report publication needs no GitHub write permission.
- Main branch API returned protected:false and required checks enforcement off;
  repository rulesets returned an empty list. Detailed protection read returned
  403 (integration lacks administration access). Required approvals cannot be
  certified. Owner review is procedural, not an enforced gate verified here.
- Existing scripts audit built HTML, deployed HTTP/HTML, and resolve exact-commit
  Cloudflare preview URLs. Existing workflow retains available evidence on failure.
- [Baseline run 37512974306](https://github.com/zeeshansarwar12/graphmaker/actions/runs/37512974306)
  had successful verify, verify-preview and Cloudflare checks for the baseline SHA.
  This proves historical execution, not the new PR's result.
- Cloudflare's successful check advertises an immutable pages.dev URL. Account-side
  branch/deployment settings were not accessible or changed; production triggers
  are therefore not fully certified. Do not merge as part of this pilot.

## Reporting regression checks

`python -m unittest discover -s tests/automation -v` uses Python's standard library
and runs in CI alongside existing unit tests. It checks that failures/skips/missing
outputs and stale or invalid preview evidence cannot become a green recommendation.
