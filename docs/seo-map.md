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
