# Testing Strategy

## Quality bar
A graphing product cannot rely on manual spot checks for data transformations and statistics. Math, parsing, persistence, and critical interaction flows require repeatable tests.

## Unit tests — Vitest
Prioritize pure logic:
- CSV parsing normalization
- pasted table parsing
- XLSX normalization adapters
- type inference
- missing/blank cell handling
- categorical + numeric series mapping
- XY pairing
- pie-chart compatibility rules
- histogram binning
- box plot quartiles / median / IQR / whiskers / outliers
- regression calculations
- R²
- correlation
- project schema migrations
- serializer/deserializer for saved projects

Statistical tests should use known datasets with expected outputs.

## Component/integration tests
Test important editor behavior where practical:
- editing a cell updates graph state
- adding/removing row and series
- chart-type switching preserves compatible data
- incompatible chart type produces recoverable guidance
- sample data can be cleared
- import populates the existing grid

## Playwright critical flows
At minimum:
1. Homepage loads with sample data and rendered bar chart.
2. User edits sample value and chart updates.
3. User pastes a rectangular dataset.
4. User uploads a CSV.
5. User switches chart type.
6. User saves project locally, refreshes, and reopens it.
7. User exports PNG or SVG.
8. Mobile viewport has no horizontal overflow and core actions remain usable.

Specialist flows:
- scatter trendline/regression output
- box plot calculation from raw values
- histogram generation

## Regression policy
Every bug in parsing, calculations, persistence, or chart configuration should receive a regression test before or alongside the fix.

## Build gate
A task that changes behavior is not complete until relevant checks pass:
- lint
- typecheck
- unit tests
- relevant Playwright tests
- production build

## Linux deployment verification

`.github/workflows/deployment-check.yml` runs the deployment pipeline on Ubuntu with Node 24 and Python 3.12 for pull requests, pushes to `main` or `codex/**`, and manual runs. It runs checks independently after installation so one failed check does not hide the others. Built HTML and browser assertions require a successful build. Chromium system dependencies are installed before browser tests. High-severity dependency audit findings fail the job.

Every run uploads available logs, `dist`, the rendered page audit, and Playwright reports, including on failure. A successful workflow verifies the artifact; deployment HTTP redirects and 404 responses still require verification on the actual preview or production host. The workflow contains no deployment step.

After artifact verification passes, `verify-preview` discovers Cloudflare Pages' successful deployment for the exact commit, then audits deployed pages, redirects, assets, and HTML before running the full Playwright suite against that preview. `PLAYWRIGHT_BASE_URL` selects the deployed origin and disables the local artifact server; without it, the existing local test setup is unchanged. Preview evidence is retained as a separate artifact. No production deployment or merge is performed by this workflow.

## CI status evidence

The final `report` job preserves machine-readable JSON and matching Markdown in
`automation-report-<run_id>-<attempt>` and the Actions summary, even when upstream
verification fails or is skipped. It records individual outcomes and actual
checkout SHAs; only complete successful evidence permits a PM review recommendation.
It performs no release action. Run reporting regression checks with
`python -m unittest discover -s tests/automation -v`. See
[automation operations](automation-operations.md) for handoffs, limitations and the
PR report contract.

## Manual visual review
Automated tests do not replace UI inspection. For significant UI tasks, inspect desktop and mobile states for:
- clipping
- overflow
- focus visibility
- chart legibility
- data-grid usability
- error/empty states
- loading states if any


## XY / equation cluster regression coverage
`tests/unit/xy-cluster.test.ts` covers signed multi-series XY data, missing-pair gaps, coordinate settings and equal scale, schema-v1 restoration, least-squares degeneracies, restricted expression parsing, the four supported examples, domain gaps, a non-grid-aligned pole, and high-frequency aliasing.
`tests/e2e/xy-cluster.spec.ts` covers named-coordinate SVG values, plot visibility and restore, blank-plane pointer plotting, axis validation, regression output, multiple equations and inline validation, save/reopen, viewport controls, PNG/SVG downloads, narrow screens, keyboard entry, pointer panning and print visibility.
Run the full browser suite because the new type also appears in the shared catalog. SEO tests and the built-HTML auditor expect 11 tools and 14 indexable routes (16 pages including legal pages). New URL canonicals/schema/sitemap and contextual cross-links must pass before publication. Retain the existing XY URL and metadata.
