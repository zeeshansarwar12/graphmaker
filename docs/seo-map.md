# SEO Architecture

## Principle
Create a dedicated URL only when search intent or product workflow is materially distinct. Do not create pages only to match modifiers.

## Homepage
`/` targets the generic graph-maker intent and serves as the root authority/product page.

Primary theme:
- graph maker
- free graph maker
- online graph maker
- graph creator/generator variants naturally in copy

Do not create separate pages for:
- free graph maker
- online graph maker
- graph maker no signup
- graph maker no login
- free online graph maker

## Phase 1 tool URLs
- `/bar-graph-maker/`
- `/line-graph-maker/`
- `/pie-chart-maker/`
- `/xy-graph-maker/`
- `/scatter-plot-maker/`
- `/box-plot-maker/`
- `/radar-chart-maker/`
- `/histogram-maker/`
- `/dot-plot-maker/`
- `/supply-and-demand-graph-maker/`

## Directory/hubs
- `/tools/` — complete graph-tools directory
- future `/statistics-graph-tools/` if/when the Phase 2 statistics cluster is large enough
- future `/data-graph-tools/` if input-workflow content becomes substantial
- future `/use-cases/` or equivalent structure when use-case pages are justified

Do not create empty hubs just to complete a hierarchy. A hub should contain enough useful child content to justify its existence.

## Phase 2 specialist URLs
Candidates:
- `/multiple-line-graph-maker/`
- `/error-bar-graph-maker/`
- `/standard-deviation-graph-maker/`
- `/normal-distribution-graph-maker/`
- `/line-of-best-fit-graph-maker/`

## Later content/use cases
Potential pages only after validation:
- graph maker for research papers
- graph maker for lab reports
- graph maker for students
- economics graph workflows
- science graph workflows

Avoid thin demographic pages whose editor/workflow does not materially change.

## Future separate product lanes
Do not mix these into the V1 IA automatically:
- equation/function graphing
- crochet/cross-stitch pattern graphing
- graph theory/network diagrams
- AI graph maker

## Internal linking
Homepage directly links to:
- all 10 existing graph tools
- `/tools/`
- major hubs once they exist

Specialist pages should link primarily to 3–6 closely related tools, not mechanically to every page.

Example scatter links:
- XY Graph Maker
- Line of Best Fit Graph Maker
- Error Bar Graph Maker
- related statistical graph tools

Example bar links:
- Line Graph Maker
- Pie Chart Maker
- future Stacked Bar / Error Bar where appropriate

## Click depth
Aim for meaningful pages to remain within roughly 2–3 clicks of the homepage.

## On-page structure for tool pages
1. clear H1 matching the job
2. short promise
3. working tool near the top
4. concise usage instructions
5. tool-specific features
6. examples/use cases
7. FAQ where it answers real questions
8. related graph tools

## SEO guardrails
- Do not publish keyword-swapped clones.
- Do not generate location/year/amount variants.
- Do not stuff `free`, `online`, `no signup` into every heading.
- Product quality and job completion are more important than exact-match repetition.
- Use static HTML for indexable explanatory content and internal links.


## Approved XY cluster extension (2026-10-19)
- Existing `/xy-graph-maker/`: entered numeric coordinate pairs, connected paths, multiple Y series and coordinate-plane mode. Preserve its title and canonical.
- Existing `/scatter-plot-maker/`: independent observations, linear regression and R².
- New `/equation-graph-maker/`: direct explicit equation/function input. Targets equation graph maker, graph maker from equation and function graph maker on one working tool page.
- No separate coordinate-plane URL. No keyword-variation or informational-only pages.
- All three are sibling tools in `/tools/`. The catalog exposes Equation from homepage, hub, footer and editor; contextual links run both directions between Equation and XY/Scatter. Intended click depth is at most two from home.
- The catalog drives the sitemap; the shared tool shell provides a self-canonical URL, WebApplication and BreadcrumbList. Do not change existing XY metadata to target Equation.

## Sitemap modification dates
- src/content/pageLastModified.ts records each indexable page's last significant content or tool update (UTC date), verified from Git history.
- Update affected entries alongside meaningful page/tool changes, including shared editor changes that affect multiple tools. Do not bump dates for builds, deployment, or cosmetic header/footer changes.
- The sitemap requires an explicit date for every indexable route; SEO tests check complete coverage, valid dates and no future dates.

## Approved tree tool (2026-10-20)
`/tree-graph-maker/` owns tree graph maker and tree diagram maker intent. It creates branching parent–child diagrams, not treemaps or machine-learning trees. Use the shared catalog to link from home, hub, About, footer and editor; link contextually with Bar for structure versus numerical comparison. One self-canonical page with the shared WebApplication and BreadcrumbList schema; include in sitemap. Total: 12 tools, 15 indexable routes, 17 pages including legal pages.

## Tree diagram keyword cluster and templates (2026-10-20)
Retain `/tree-graph-maker/` as the single canonical tool URL. Prioritize tree diagram / tree diagram maker in the title, H1, definition and template gallery. Support tree chart, tree diagram generator, create tree diagram, tree diagram creator and tree graph maker naturally in explanations and FAQs. Tree draw has mixed intent; use natural draw-a-tree-diagram wording without creating a botanical or genealogy landing page. Six original presets have static, crawlable on-page previews and fragment links, not separate indexable template pages. Do not claim probability calculations or multiple-parent genealogy support. The owner's 10k Semrush volume is user-provided; additional API metrics were unavailable. See `docs/tree-diagram-research.md`.

The tree page includes an accessible static labeled project diagram beside its import table, with root/branch/leaf explanations and an edit-template link. Feature and how-to copy reflects direct label editing, draft-preserving template selection, pan, zoom and fitting; the FAQ heading uses natural wording.

## Supply and demand cluster — 21 October 2026
Keep /supply-and-demand-graph-maker/ canonical. Cover curve generator, maker/plotter/chart/free/online variants naturally on this page. Six crawlable scenario previews link into the shared editor using fragments. Add worked equilibrium, movement-versus-shift and practice explanations. AI remains unsupported. No Word/Excel guide routes.

## Compact supply-demand learning — 21 October 2026
Owner requested remaining educational intent with minimal writing. Keep examples, shift reference, linear equations/functions, four practice problems and deeper supply questions on the existing tool URL. All useful references connect to real templates or existing inputs through fragments. No new guide routes or thin informational pages; no AI/trading/Word/Excel targeting.

## Bar cluster: grouped comparison — 22 October 2026
Owner approved building the discussed bar cluster one page at a time. First page: /grouped-bar-chart-maker/ owns grouped, double, clustered, side-by-side, triple, quadruple and multiple bar graph/chart intent. The /bar-graph-maker/ pillar retains its URL and metadata and links to this workflow. Use one shared Bar editor with a matched-unit class-score example, explicit series instructions and page-isolated local saving. Register the workflow in allGraphTools for the directory, footer and sitemap, without creating another chart engine or duplicate editor selector. Graph/chart synonyms share this canonical. No AI or Excel keyword pages; no unpublished stacked/percentage links.

## Graph/chart wording — 22 October 2026
Owner approved natural chart wording in the homepage SEO title, intro, description and contextual bar/line links. Keep GraphMaker as the WebSite/Organization name and retain all H1s and URLs. The homepage working tool has WebApplication schema; its alternateName Free Online Chart Maker is supported by visible FAQ copy. Bar, line and grouped tools use explicit graph/chart alternateName values supported by visible text. No keyword lists, brand renaming or duplicate routes. Schema reflects page content; it is not a ranking guarantee.

## Connected homepage schema — 22 October 2026
Owner requested homepage enrichment first. Stable #website, #organization, #webpage, #application and #primaryimage IDs connect WebSite, Organization, WebPage, WebApplication and ImageObject. The page references its application, site, publisher and existing 1200x630 social image. The application declares verified features, JavaScript/browser requirements, language, free access, publisher and the existing creator identity. Use the maintained page modification date. No fabricated ratings/reviews, new routes or unsupported actions. Other page schemas remain unchanged in this step.

## Horizontal bar workflow — 22 October 2026
Owner resumed the agreed bar cluster. /horizontal-bar-graph-maker/ owns horizontal bar graph/chart maker and sideways bar intent. Reuse the Bar engine with horizontal orientation, an ordered single-series ranking sample, grouped-series instructions, independent local saving and shared exports. Add reciprocal links with the bar pillar and grouped page, and include in the directory, footer and sitemap. Keep fourteen workflow tools but twelve engine choices. This new page opts into connected WebPage/WebApplication schema referencing the homepage website and publisher; existing tools remain unchanged. No stacked/percentage claims or AI/Excel keyword targeting.

## Bar templates — 22 October 2026
Three original static preview cards on each bar cluster page link to #bar-template-ID fragments. Each opens editable data in the shared editor with its own title, orientation and series. No new template routes. Visible grouped H1 is Grouped Bar Graph Maker; retain /grouped-bar-chart-maker/ and chart/graph synonyms.

## Stacked bar workflow
/stacked-bar-graph-maker/ covers stacked and segmented graph/chart maker intent using the shared Bar engine. Raw values only; 100% normalization remains separate work.

## Bar parent and child hierarchy
Bar Graph Maker is the parent of the Grouped, Horizontal and Stacked workflow pages. Child breadcrumbs are Home > Bar Graph Maker > current page; visible directory/footer navigation nests children under Bar. Connected WebPage schema links child isPartOf to the bar parent, whose hasPart references the three children. Flat canonical URLs remain unchanged.
