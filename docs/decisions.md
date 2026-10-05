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
