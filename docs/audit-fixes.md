# GraphMaker audit fixes

## Group 1: URL evidence (2026-10-04)

Live `curl -sI https://graphmaker.site/about/` returned HTTP 200; the slashless
`https://graphmaker.site/about` returned HTTP 308 with `Location: /about/`.
The previously reported reverse redirect was not reproduced. Keep trailing-slash
canonicals, Open Graph URLs, sitemap entries, and internal page links. Astro already
sets `trailingSlash: 'always'`; `build.format: 'directory'` is now explicit.
No `_redirects`, `_headers`, Wrangler, or other host redirect configuration is
checked in. Recheck these two curl commands after deployment; hosting settings
outside this repository can still affect routing.

The owner's audit supersedes older eight-tool navigation guidance in the design
and SEO docs. All ten existing graph makers will be listed consistently.

## Changes by group

1. **URLs:** retained verified trailing-slash URLs; made directory output explicit.
2. **Tool catalog:** one ten-tool catalog supplies the footer, homepage, tools hub,
   About list, and editor tabs. Every tab has a distinct glyph; related H2s agree.
3. **Copy:** replaced all stale public-facing launch copy with the supplied FAQ
   answers, functional XY features and usage guidance, and linked use-case cards.
   Internal code identifiers and historical technical docs retain their names.
4. **Examples:** histogram and dot-plot tables, headers, captions, and the dot-plot
   repetition FAQ derive from the editor samples (15 and 20 observations).
5. **Metadata:** shared large social card, 1200×630 PNG and editable SVG; locale
   and site name; complete viewport; no generator tag; homepage-only verification
   tags; supplied shorter titles; bar-chart wording. Default image is a **design
   review placeholder**, used for every page rather than inventing per-tool art.
6. **Product content:** comparable product-sales line samples with matching table
   and FAQ; documented actual median-of-halves quartiles without changing math;
   linked chart chooser with a separate profiles group; owner/about placeholders.
7. **Trust:** shared placeholder contact links and dates; accurate cookie and GA
   description; licensing placeholder; legal pages remain noindex.
8. **Schema:** shared visible/schema breadcrumbs, WebApplication on ten tools,
   WebSite and Organization on home, ItemList on the hub. No ratings, SearchAction,
   or FAQPage. The public island facade is called GraphWorkspace so the private
   implementation name does not appear in the HTML's hydration attributes.

## Structured-data baseline and limitations

Source inspection before schema edits found WebSite on the homepage and
BreadcrumbList on every tool page. The hub, About, Privacy, Terms, and 404 had no
JSON-LD. There were no WebApplication, Organization, ratings, or FAQPage schemas.
**The requested rendered baseline could not be inspected:** production builds
failed before generating page HTML. This is a source inventory, not a claim about
verified dist output. FAQPage was omitted because it is optional and low priority.

## Owner placeholders

- `[PLACEHOLDER: contact email]`: shared footer, About, Privacy, and Terms. The
  mailto target deliberately contains that placeholder, not an invented address.
- `[PLACEHOLDER: date]`: last-updated text on both legal pages.
- `[PLACEHOLDER: one short paragraph on who builds GraphMaker and why]`: About.
- `[PLACEHOLDER: owner to confirm licensing wording; suggest "Graphs you create and export are yours to use"]`: Terms.
- The social image is also a design-review placeholder, without an invented owner
  or contact identity.

## Analytics and consent recommendation

BaseLayout loads async gtag.js on every page, using the production GA4 ID
`G-JM5S5JGFJJ` unless a validated PUBLIC_GOOGLE_ANALYTICS_ID overrides it. The inline
config runs immediately; allow_ad_personalization_signals and allow_google_signals
are false, and anonymize_ip is true. No consent default/update calls or consent
banner are present. No editor data is added to analytics events by application code.

For EU visitors, treat these nonessential analytics cookies as requiring prior
consent. Disabling advertising signals does not provide consent handling. The
recommended next step is a consent UI/CMP with **basic consent mode**: block GA
until analytics consent, provide clear accept/reject choices and withdrawal.
Alternatively disable GA for those visitors or replace it with an independently
reviewed privacy-preserving analytics setup. Advanced consent mode can send
cookieless pings before consent and needs its own legal/privacy review; it is not
equivalent to blocking analytics. Nothing in this recommendation is implemented.

Sources: [EU cookie guidance](https://europa.eu/youreurope/business/growing/digitalising/online-privacy/index_en.htm),
[Google consent-mode behavior](https://developers.google.com/tag-platform/security/concepts/consent-mode).

## Deferred backlog specs

- **Scatter statistics:** optional least-squares trendline from valid paired rows,
  equation, R² and Pearson r. Handle too few observations and constant X/Y with
  explanatory unavailable states; no invented statistics. Include settings in
  local/project-file persistence and exports. Test known positive/negative
  relationships, missing values, and degenerate inputs. Update the "Not yet" FAQ
  only when this ships.
- **Secondary line Y axis:** opt-in series-to-left/right-axis assignment with
  explicit labels/units, independent bounds and legible colors. Preserve time-axis
  behavior and single-axis defaults. Adapt mixed-scale guidance; persist choices
  and verify imports, exports and mobile labels.
- **Stacked bars:** not currently supported. Add grouped/stacked mode to the shared
  bar config, clear totals/series tooltips, positive/negative stack behavior and
  persistence/export tests. A separate page needs a distinct workflow and content.
- **Horizontal bars:** already supported by the existing orientation control.
  Add guidance to the existing bar page first; create a separate page only if a
  materially distinct workflow justifies it, rather than a keyword-only clone.
- **Donut:** not currently exposed; the pie renderer uses a zero inner radius.
  Add an inner-radius/display setting while preserving percentage calculation,
  category legend and value-series selection; test saving and exports before
  deciding whether a separate page is justified.
- **Area:** no area control is exposed. Add optional fill under a line with clear
  opacity and baseline semantics; retain date spacing and missing-value gaps.
  Test multiple-series legibility, persistence and exports. Decide separately
  whether stacked areas and a dedicated workflow/page are useful.

## Verification status

- ESLint passed.
- Astro check passed with 0 errors, 0 warnings, and 0 hints after correcting the
  box-plot section-array merge.
- `node scripts/verify-audit-source.mjs` passed: ten unique slugs/icons, all tool
  title/description lengths, sample-table parity, 15/20 observations, four dots at
  18, no mixed-scale warning for the line sample, actual Class A Q1=72/Q3=88,
  and breadcrumb helper JSON. The 15-page source inventory is in
  `docs/audit-source-metadata.md`; it is explicitly not a rendered-HTML report.
- Builds were attempted after each group. Windows application-control policy
  blocked the native Rust compiler binaries. Supported WASI fallbacks loaded, but
  their resolver failed on Astro's prerender entry module and unit-test imports.
  Build success, absence of build warnings, and rendered schema remain unverified.
  Local-only fallback packages/adapters are ignored; package.json and the lockfile
  are unchanged. No security policy was disabled.
- Vitest was attempted; all 19 suites failed during module loading, with no tests
  executed. These are environment failures, not a passing unit-test run.
- Playwright SEO and line tests were attempted; execution stopped because the
  installed browser executable was missing. Browser behavior is unverified.
- The built-HTML/link script ran and correctly refused to claim success because
  all 15 page files were missing. **Broken-link count is unverified**, not zero.

Run on a working build host before deployment:

```sh
npm ci
npm run lint
npm run typecheck
npm test
npm run build
python scripts/audit-built-html.py
npx playwright install chromium
npx playwright test
```

The HTML audit prints all requested metadata columns, parses every page's JSON-LD,
checks schema against visible breadcrumbs and tool copy, checks tab/footer counts,
and checks internal links including fragments. `--inventory` prints existing
rendered JSON-LD without enforcing the new rules. Successful audit output is saved
to `docs/audit-pages.md`.

All audit commits use the explicit local agent identity `Codex <codex@localhost>`;
no owner identity was invented. Changes are local and have not been pushed or
deployed.
