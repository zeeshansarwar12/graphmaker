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
`secondary-series.spec.ts` verifies cold-document Box Plot outlier marks and Scatter
regression lines using canvas pixels and actual SVG path geometry / decoded PNG
pixels. Each runs at desktop and mobile widths, both directly and after another
chart family was loaded in the same document. Text summaries and regression
equation/R² are checked alongside rendered output; a ready canvas or an option
object alone cannot detect an unregistered secondary series.

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

## Tree regression coverage
`tree.test.ts` validates tree structure, unique IDs, parent references, root count, cycles, limits, chart layouts, subtree operations and schema-v1 persistence. `tree-tool-page.spec.ts` covers editing, parent selection, branch removal, invalid imports, autosave/reopen, full PNG/SVG/JSON downloads, mobile overflow, tool discovery and page metadata. Full suite and built-HTML audit must pass with 12 tools.

## Tree template coverage
`tree-templates.test.ts` validates every preset, clone isolation and unknown IDs. `tree-templates.spec.ts` covers static gallery links/metadata, non-destructive draft selection, initial template links after saved-work restoration, persistent/session-only preference changes, deletion, autosave restoration and narrow mobile layout. All template fragments must resolve to static IDs and all variants retain the existing canonical URL.

Clipboard CSV regressions cover comma-separated values, quoted commas/escaped quotes, TSV preference, optional title lines above valid header tables, malformed rows, and both cell-paste and Paste data flows with local restoration.

Equation switching regression: paste the exam CSV, enter f(x), autosave and refresh, then return to Bar and verify all five rows and the original title. Repeat the mode switch. Unit tests validate optional table backups and reject malformed backups.

## Supply-demand templates
Unit tests verify all six equilibria, interpolation, no crossings, inverse tables, schema validation and comparisons. Browser coverage checks template replacement/cancel, saved settings, baseline visibility, equation-generated schedules, exports and mobile overflow.

Supply-demand draft regression checks preserve edited cells, titles, shifts and monochrome/original settings when opening a second template, switching back, refreshing and deleting a draft. Workspace parsing rejects invalid snapshots, duplicate IDs and excess drafts; a full collection refuses new templates without eviction.

Mobile economics regression covers two-decimal results, original-data cue, Adjust shifts focus, Reset shifts, PNG generation feedback and narrow-screen overflow. Calculation precision remains unchanged.

Supply-demand quick-help coverage checks static headings and answer content, actionable equation/shift links, template draft preservation and mobile reflow. References are concepts, not new graph modes or a general solver.

## Grouped bar workflow — 22 October 2026
The grouped-bar browser test verifies adding a third series, editing, local restore, SVG download, separation from the main bar page, crawlable explanations and mobile overflow. SEO architecture includes the new workflow route while the editor retains twelve engine choices. Built HTML audit expects thirteen tool pages and eighteen pages including legal routes.

## Focused chart selection
Specialist tests use Change chart type instead of desktop radios. SEO tests and built HTML audit verify the homepage strip and twelve options in the specialist native selector. specialist-selector.spec.ts checks desktop/mobile switching, data retention, independent bar orientation, keyboard use and overflow.

Horizontal bar tests cover horizontal defaults, ordered categories, editing, a second series, switching orientation, local restoration, SVG export, separation from the bar pillar, mobile overflow and connected schema. HTML audit expects fourteen tool routes and nineteen normal HTML routes, plus the 404 page.

Bar template regressions validate all nine datasets, clone isolation and bounded workspace parsing. Browser tests cover static galleries, click/select/direct-fragment loading after restoration, preservation of edited titles/data/orientation across draft switching and refresh, deletion, page isolation and mobile overflow.
