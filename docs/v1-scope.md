# V1 Scope

## Launch pages
- `/` — Free Online Graph Maker / generic editor
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
- `/tools/`
- `/about/`
- `/privacy/`
- `/terms/`

## Launch capabilities shared across the editor
- spreadsheet-like data grid
- manual editing
- paste from Excel/Google Sheets
- CSV upload
- XLSX upload
- live graph update
- graph title
- axis titles where relevant
- series names
- legend on/off
- grid on/off where relevant
- basic color/style selection
- PNG export
- SVG export
- IndexedDB local save
- saved-project reopen on the same device
- responsive layout

## Tool-specific behavior

### Bar Graph Maker
- categorical labels + one or more numeric series
- grouped bars
- stacking can be added if cleanly supported

### Line Graph Maker
- one or more numeric series
- multiple-line support should be possible from shared series handling

### Pie Chart Maker
- one categorical label column + one numeric value series
- friendly recovery when data has multiple series

### XY Graph Maker
- explicit X and Y columns
- point/line display appropriate to generic XY intent

### Scatter Plot Maker
- X/Y data
- trendline
- regression equation
- R²
- correlation where statistically appropriate

### Box Plot Maker
- raw numeric data input
- compute quartiles, median, IQR, whiskers, outliers
- calculations require unit tests

### Radar Chart Maker
- categories + multiple series where supported

### Histogram Maker
- raw numeric data
- sensible automatic bins
- manual bin settings may be progressive/advanced

### Dot Plot Maker
- one selected numeric column of raw observations
- repeated values stack vertically by frequency
- true numeric X-axis spacing
- minimal series and dot-size controls

### Supply and Demand Graph Maker
- explicit quantity, demand, and supply column mapping
- true numeric quantity axis with two connected curves
- exact or interpolated equilibrium detection within the supplied range
- no fabricated out-of-range equilibrium

## Phase 2 targets
- `/multiple-line-graph-maker/`
- `/error-bar-graph-maker/`
- `/standard-deviation-graph-maker/`
- `/normal-distribution-graph-maker/`
- `/line-of-best-fit-graph-maker/`

## Explicitly out of V1
- user accounts
- backend database
- cloud sync
- real-time collaboration
- public project galleries
- AI APIs
- equation parser / Desmos-like calculator
- network graph editor
- crochet/cross-stitch tools
- programmatic thin SEO page generation
- dozens of template pages
