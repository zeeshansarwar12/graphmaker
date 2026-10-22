# Architecture & Product Decision Log

Do not rewrite prior decisions silently. Add a new decision with date/context when a decision changes.

## DEC-001 — Astro as the site framework
**Status:** Accepted

Astro owns routing, page shells, and SEO content. React islands handle the graph editor.

**Reason:** SEO-first static delivery with interactive functionality only where needed.

## DEC-002 — React for interactive editor components
**Status:** Accepted

Use React only for interactive islands, not as a full-site SPA by default.

## DEC-003 — Apache ECharts as V1 chart engine
**Status:** Accepted

**Reason:** Better headroom than a simple chart library for scatter, box plot, radar, statistical visualization, annotations, multiple axes, and future advanced charts without taking on Plotly-level product weight.

## DEC-004 — One shared GraphEditor
**Status:** Accepted

All SEO tool pages use shared graphing infrastructure with configuration and specialist controls.

**Reason:** Avoid duplicated code and divergent UX.

## DEC-005 — No backend/database in V1
**Status:** Accepted

Project data is stored locally with IndexedDB.

**Reason:** Preserve no-signup/privacy positioning and avoid backend complexity before user demand proves it necessary.

## DEC-006 — No account required
**Status:** Accepted

Core graph creation, saving on-device, and export must remain usable without signup.

## DEC-007 — Sample data on first load
**Status:** Accepted

Homepage and tool pages may show small clearly labelled sample datasets.

**Reason:** Avoid an empty, intimidating initial state and demonstrate instant value.

## DEC-008 — Homepage tool is the hero
**Status:** Accepted

Do not place a large marketing hero or illustration above the working graph maker.

## DEC-009 — 40/60 desktop editor split
**Status:** Accepted as design direction

Data area approximately 40%, graph approximately 60% on wide screens. Responsive implementation may adjust based on usability.

## DEC-010 — Do not create modifier-only SEO pages
**Status:** Accepted

No separate pages for `free`, `online`, `no signup`, `no login`, etc. when the underlying graph job is the same.

## DEC-011 — Dedicated pages require distinct jobs
**Status:** Accepted

XY and Scatter can be separate because user expectations differ: simple X/Y plotting vs regression/correlation/trendline workflows.

## DEC-012 — Client-side user data
**Status:** Accepted for V1

Pasted/uploaded datasets should remain in the browser. Analytics must not include dataset contents.

## DEC-013 — Build vertically
**Status:** Accepted

Complete and validate one end-to-end graph workflow before rapidly adding every chart type.

## DEC-014 — V1 starts with bar workflow foundation
**Status:** Accepted

First implementation milestone: homepage shell + shared editor + functional bar-chart path. Expand only after the foundation is stable.

## DEC-015 — Optional privacy-limited GA4 page analytics
**Status:** Accepted

Google Analytics 4 is enabled with the production Measurement ID and may be overridden for alternate deployments through `PUBLIC_GOOGLE_ANALYTICS_ID`. It is limited to standard page-view analytics with advertising personalization and Google signals disabled.

Graph datasets, uploaded-file contents, project names, graph titles, cell values, and other editor state must never be included in analytics events.

## DEC-016 — Complete ten-tool navigation and trailing-slash audit
**Status:** Accepted (owner audit request, 2026-10-04)

All ten existing graph makers appear in the homepage grid, tools hub, About list,
footer, and editor selector, from one shared catalog. This supersedes the older
eight-tool homepage guidance. Related links remain curated for each tool.
Trailing-slash URLs remain canonical: the live slash URL returned 200 and the
slashless URL redirected to it with 308. Static output uses directory format.
No graph algorithms, storage boundary, analytics loading, or consent behavior
change in this audit.

## DEC-017 — Owner-requested AdSense integration
**Status:** Accepted (owner request, 2026-10-05)

The shared head loads the owner-provided AdSense publisher script. The Privacy
page discloses advertising cookies separately from Analytics and links to
advertising choices. Root ads.txt authorizes the supplied Google publisher ID.
Do not send editor datasets or project state to advertising services. Do not
claim account approval or a configured consent platform without verification.
Google-certified consent configuration and review status remain account-side
checks; adding the script is not evidence that either has been completed.


## DEC-018 — XY improvements and explicit equation graphing
**Status:** Accepted (owner approval of XY cluster implementation, 2026-10-19)

Extend the shared editor with multiple Y series on one numeric X axis, coordinate-plane controls, labels and pointer plotting. Keep coordinate-plane features on `/xy-graph-maker/`; do not add a duplicate URL. Add least-squares trendline and R² to Scatter.

Add `/equation-graph-maker/` as a sibling tool under `/tools/`, linked contextually with XY and Scatter. This supersedes the equation-parser exclusion for explicit real-valued `y = f(x)` only. Implicit equations, inequalities, symbolic solving and parametric plots remain outside this scope.

Use the existing GraphEditor, ECharts, IndexedDB, imports and export infrastructure. A bounded arithmetic grammar and worker calculate expressions locally without JavaScript evaluation or a new dependency. Support up to eight expressions, 512 characters and 128 parse operations per expression; bounded adaptive sampling leaves unresolved segments disconnected. Do not promise symbolic or arbitrary-function completeness.

New settings are optional when reading schema-v1 projects, validated when present, and restored with backward-compatible defaults. Publishing remains a separate owner-approved action after verification.

## DEC-019 — Simple tree graph maker
**Status:** Accepted (owner request, 2026-10-20)

Add `/tree-graph-maker/` for parent–child hierarchies using the shared GraphEditor, ECharts TreeChart, client-side tabular state, IndexedDB and PNG/SVG exports. This is a bounded extension of the network-editor exclusion, not a general graph editor. Exactly one root, one parent per non-root node, unique IDs, no cycles, at most 50 nodes and 10 levels; labels and IDs at most 80 characters. Tree settings reuse orientation and the first series color. Existing schema-v1 project files remain compatible. Tree projects use ID, Label, Parent ID columns and remain local.

Provide editable labels, parent selection, add-child and confirmed branch removal, two layout directions, and optional shared spreadsheet imports. Validate imported hierarchies before drawing and show inline recovery guidance. Selecting Tree preserves existing data and offers an explicit sample-tree replacement action if incompatible. Probability calculations, edge labels, machine learning, genealogy-specific relationships, general networks and collaboration remain out of scope. One canonical tool page covers tree graph maker and tree diagram maker; no keyword-variant page. Publishing remains separate.

## DEC-020 — Tree diagram templates and keyword consolidation
**Status:** Accepted (owner request, 2026-10-20)

Keep the existing tree URL and shared editor. Promote Tree Diagram Maker as its public heading and catalog name, covering overlapping diagram/chart/generator/creator intent on one page. Add six original, valid parent–child templates: blank hierarchy, project plan, organization chart, decision outline, website structure, and classification. Static gallery links use existing-page fragments; no duplicate SEO routes. Template loading asks before replacing data, title and orientation, and uses the current local saving/export infrastructure. Canceled or unknown template links must leave the project unchanged. Decision templates remain diagram outlines without probability/expected-value calculations. No general network, genealogy or AI scope expansion.

## DEC-021 — Preserve tree drafts when opening templates
Accepted: owner request, 20 October 2026. Supersedes destructive template replacement in DEC-020. Selection or gallery links open a new draft immediately; no Load template button or replacement dialog. Keep up to 20 diagrams, never silently discard older drafts, and expose My diagrams and explicit deletion. Remember my diagrams on this device is checked by default as a storage preference, not affirmative consent. Unchecking removes persistent tree workspace and legacy tree copies; drafts remain only in memory until the page closes. Store validated schema-v1 snapshots in IndexedDB with serialized writes and a small localStorage preference. No cloud storage or new dependency.

## DEC-022 — Supply and demand templates and comparisons
**Status:** Accepted (owner instruction, 21 October 2026). Extend the existing shared GraphEditor and ECharts adapter with six editable scenario presets, optional baseline curves/equilibrium, horizontal quantity shifts, textbook price schedules, bounded coefficient-to-table generation, and monochrome styling. Preserve legacy inverse-table defaults and schema-v1 saves. All data stays client-side. One canonical tool URL; no AI, Word/Excel guides, new backend, or separate app.

## DEC-023 — Preserve supply-demand graphs when selecting templates
Accepted: owner request, 21 October 2026. Templates open new drafts rather than replacing current work. My graphs switches complete snapshots (table, title, shifts, appearance). Separate validated IndexedDB workspace, serialized writes and a 20-graph limit preserve earlier graphs across refreshes. Migrate the legacy single saved graph when no collection exists. Never evict silently; explicit deletion is confirmed. Other graph pages keep their existing storage.

## DEC-024 — Supply-demand user walkthrough refinements
Accepted: owner approval, 21 October 2026. Improve narrow-screen graph legibility and control proximity without changing model math or saved project structure. Keep price/quantity values in a comparison table, reduce duplicate original series and numerical label clutter, expose original-data/shift relationship, compact mobile discovery, and report export generation/failure without claiming a file was saved.

## DEC-025 — Tool-first supply-demand learning
Accepted: owner instruction, 21 October 2026. Replace the earlier prose learning block with compact actionable reference cards and expandable answers on the same canonical tool page. Add direct equation/shift input links, four practice problems, short slope/market/land/schedule explanations and primary-source references. No additional article URLs or broad feature claims.
