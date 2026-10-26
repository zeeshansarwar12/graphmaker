# Issue #24 assertion conservation — written before test edits

Base: PR #25, 74ccbbbad40d4652259ee6fff44fec285c1c7ca3; parent integration #21, 1293c0e2e4c36e86b46dd22898eff665faf9182b. Dedicated branch codex/refactor-seo-browser-tests. PR #25 and production source remain untouched.

| Original seo-architecture.spec.ts case | Destination | Conservation contract |
| --- | --- | --- |
| Line 22: indexable metadata | Per-route hydrated snapshots + aggregate project | Exactly 18 route results; HTTP 200, title/description truthiness and limits, one H1, production canonical, robots, home-only verification tags, Twitter card/images, OG title/description/url, heading order; aggregate title/description/H1 uniqueness across every freshly hydrated result. |
| Line 89: shared hero benefits | One test per original 16 routes | Same openPage hydration/inert waits, visible benefits, four li and green spans, all four benefit texts. |
| Line 103: related links/schema | One test per original 15 tools | Same counts 3–5, no duplicates/self link, app name/H1, URL/free offer, breadcrumb type/count/path; all three bar-child parent link, breadcrumb and WebPage isPartOf assertions. |
| Line 131: icons/selector/footer | One test per original 20 linked routes | Each footer links each of 15 tools exactly once; homepage 12 buttons/distinct icons/Supply & Demand visible; each specialist zero radiogroups, visible selector, 12 options. |
| Line 176: internal links/orphans | Per-route hydrated snapshots + aggregate project | Exactly 20 route snapshots; same internal URL normalization, same-page hash target count, per-route HTTP 200; union of all captured links, all non-home routes nonorphaned, every linked path HTTP <400. |
| All other original cases | Existing file unchanged in semantics | Hub/home discovery, sitemap/robots/date checks, query canonical/legal noindex, custom 404, semantic controls/static JS/images, analytics/privacy, advertising/ads.txt, wording/schema, connected home schema, bar parent hierarchy all retained. |

Implementation mechanism: independent snapshot project, dependent cross-page aggregation project, existing chromium project for other tests. All use existing Desktop Chrome and default 30s/5s budgets. No retries added; QA explicitly uses --retries=0. The snapshot output directory is cleared by Playwright at run start; only fully validated fresh route results are written. Aggregation checks exact route membership/count; missing/failed collectors block dependent aggregation rather than silently comparing a subset. Route collectors are independent so one failure does not skip other routes. No production source, workflow, deployment/security setting or navigation helper edits.

Planned QA: lint/typecheck/units/build/HTML/audit/reporting; repeated four-worker and serial SEO runs; complete browser suite; exact-head CI and immutable nonproduction preview. If full QA reproduces zero-height canvas: report and stop per PM.

Expression audit: all 131 original matcher expressions are retained across the split files, with two original duplicate HTTP-200 calls consolidated per route and the description non-null assertion becoming unnecessary in the typed snapshot aggregator. Three added completeness checks require all 20 route keys, all 18 metadata route keys and explicit metadata count 18. The new source contains 133 matcher expressions. Each original route remains in the unchanged route sets.

CI inspection found artifact QA invokes Playwright without a retry override, unlike preview QA. Configuration now sets retries to zero in every environment to enforce the owner's no-retry requirement. All recorded local browser runs already used --retries=0; their effective retry configuration is identical. Test/assertion budgets remain unchanged.
