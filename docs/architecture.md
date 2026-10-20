# Technical Architecture

## Stack
- Astro
- TypeScript
- React islands for interactive graph editor only
- Apache ECharts
- Tailwind CSS plus CSS variables/design tokens
- Papa Parse for CSV
- SheetJS (`xlsx`) for Excel import
- `simple-statistics` for statistical calculations
- Bounded arithmetic grammar and Web Worker for explicit equation graphing (DEC-018); no unrestricted JavaScript evaluation
- IndexedDB for local projects
- Vitest for unit tests
- Playwright for critical browser flows
- Cloudflare Pages for deployment

## Architectural boundary
Astro renders SEO-facing pages and static content. React owns the interactive graph application. Avoid turning the entire site into a client-rendered React SPA.

## Core component model

```text
GraphEditor
├── ChartTypeSelector
├── DataWorkspace
│   ├── DataGrid
│   ├── PasteData
│   ├── CSVImport
│   └── ExcelImport
├── GraphCanvas
├── CustomizePanel
│   ├── Graph settings
│   ├── Axis settings
│   ├── Labels
│   ├── Legend
│   └── Appearance
├── ToolSpecificControls
├── SaveProject
└── ExportMenu
```

## Shared engine rule
All graph pages should use one shared editor foundation. A page provides configuration, defaults, validation, and tool-specific controls.

Example conceptual configuration:

```ts
{
  slug: 'scatter-plot-maker',
  graphType: 'scatter',
  inputMode: 'xy',
  features: {
    trendline: true,
    regression: true,
    correlation: true
  }
}
```

Do not build independent chart applications for each URL.

## Suggested project structure

```text
src/
├── pages/
│   ├── index.astro
│   ├── tools/
│   ├── guides/
│   ├── use-cases/
│   ├── bar-graph-maker.astro
│   ├── line-graph-maker.astro
│   ├── pie-chart-maker.astro
│   ├── xy-graph-maker.astro
│   ├── scatter-plot-maker.astro
│   ├── box-plot-maker.astro
│   ├── radar-chart-maker.astro
│   └── histogram-maker.astro
├── components/
│   ├── graph/
│   ├── seo/
│   ├── navigation/
│   └── ui/
├── graph/
│   ├── configs/
│   ├── transforms/
│   ├── statistics/
│   └── exporters/
├── content/
│   ├── guides/
│   └── use-cases/
└── lib/
    ├── storage/
    ├── import/
    └── analytics/
```

## Data model
Keep a normalized internal graph-project model independent of ECharts configuration. Convert project state to ECharts options in an adapter layer.

Suggested concept:

```ts
GraphProject {
  id
  name
  graphType
  data
  series
  labels
  axes
  appearance
  toolSettings
  createdAt
  updatedAt
  schemaVersion
}
```

This prevents persisted projects from being tightly coupled to a specific ECharts option shape.

## Persistence
Use IndexedDB for projects. Include `schemaVersion` from the beginning so future migrations are possible.

Do not use localStorage for large project data. Small UI preferences may use localStorage if useful.

## Import pipeline

```text
Clipboard / CSV / XLSX
        ↓
Parser
        ↓
Normalized tabular data
        ↓
Validation / type inference
        ↓
GraphProject state
        ↓
Graph adapter
        ↓
ECharts
```

Keep parsing and normalization testable outside React components.

## Statistics
All statistical calculations live in pure functions with unit tests. UI components should consume results rather than implement math inline.

## Export
Keep export logic isolated from editor presentation. PNG/SVG export should use the chart engine where practical.

## Performance
- Hydrate only the editor island and other components that truly need client JS.
- Lazy-load heavy import libraries if practical.
- Do not load every specialist module on the homepage if code splitting can avoid it.
- Maintain fast static HTML for SEO content.

## Security/privacy
V1 must not silently transmit uploaded/pasted datasets to third parties. Analytics events should not include user dataset contents.

GA4 page-view analytics uses the production Measurement ID by default and accepts a validated `PUBLIC_GOOGLE_ANALYTICS_ID` override for alternate deployments. The shared layout disables advertising personalization and Google signals. Do not add dataset values, project names, file contents, chart titles, or other editor state to analytics events.


## Explicit equation input mode
`GraphEditor` lazy-loads `EquationInput` only for equation mode. A module worker compiles a restricted arithmetic AST and adaptively samples the visible X domain. Expressions, axis bounds, colors and visibility remain in validated local project settings. Sampled values use the existing tabular data shape and shared XY chart adapter, with blank rows marking discontinuities. Equation graphs suppress point markers and resample on viewport changes. A four-second worker timeout and bounded expression/sampling work protect the main thread.

SVG export clones the live chart options (including current grid/viewport and visibility) with animation disabled; PNG captures that same live chart. Equal scale is implemented by fitting the chart grid rectangle to the explicit coordinate bounds on resize, preserving numeric bounds rather than stretching units.

## Tree hierarchy mode
TreeInput is a lazy-loaded input panel inside GraphEditor. Its normalized table has ID, Label, Parent ID columns (all label-kind for manual editing). Tree validation is a pure transform and constructs ECharts tree nodes only after checking IDs, parent references, one root, cycles and bounded depth. GraphCanvas renders TreeChart at bounded full-diagram dimensions inside a clipped, draggable viewport. Panning is a temporary CSS translation, resettable by button or keyboard, so exports keep every node; the existing exporter captures the full diagram rather than a viewport crop. No extra dependencies or persistence schema changes.

## Chart loading
ECharts chart families load on demand through cached dynamic imports. The shared canvas initializes only after its renderer is registered; loading errors offer a save-then-reload recovery because browsers may cache failed imports, and unmounted loads cannot initialize stale charts. Spreadsheet parsing remains on-demand. Verify actual initial JavaScript requests and full editor browser regressions when changing the loading boundary.

Tree-page drafts use a separate IndexedDB workspace record containing up to 20 validated schema-v1 snapshots and an active draft ID. Writes are serialized and snapshot-cloned. A small localStorage preference persists the remember choice; disabling it deletes the workspace and legacy tree-page snapshot while keeping the in-memory drafts. Other graph pages keep their existing saving behavior. Initial template links wait for saved draft restoration.

Equation mode preserves a validated optional tableBackup (table and settings) in schema-v1 snapshots, including local saves and project exports. Leaving equation mode restores it; reset/import replaces it explicitly. Older snapshots remain compatible.
