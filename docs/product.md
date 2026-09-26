# Product Specification

## Product statement
A fast, privacy-first online graph maker that lets users paste or upload data, create a polished graph immediately, customize it, save work locally, and export it without creating an account.

## Core positioning
**Free Online Graph Maker**
- No signup
- No login
- No watermark
- Instant graph creation
- User data stays in the browser for V1

`No signup` is a product/conversion advantage, not the entire SEO strategy.

## Primary user jobs
1. I have a small table and need a graph quickly.
2. I copied data from Excel or Google Sheets and want a graph without learning a design app.
3. I need a specific graph type such as bar, line, XY, scatter, box plot, radar, or histogram.
4. I need to export a clean graph for a report, presentation, assignment, or paper.
5. I want to return later to a saved project on the same device without creating an account.

## Product principles
- Tool first, marketing second.
- Working graph visible immediately on landing.
- Sample data is prefilled and clearly labelled as sample data.
- Editing the data updates the graph live.
- Paste from spreadsheets should feel native.
- Advanced settings stay behind progressive disclosure.
- Save and download actions remain easy to find.
- Specialist pages adapt the shared editor to the actual job rather than changing only the heading.

## Homepage job
The homepage is the generic graph-making workspace. It should not try to expose every advanced capability. It should let a visitor go from data to a finished graph in seconds.

## Homepage editor default
- Default chart: bar chart
- Sample dataset: 4–5 rows
- Desktop split: approximately 40% data / 60% graph
- Graph-type selector above workspace
- Data editor left; live graph right
- Primary actions: Paste Data, Upload CSV, Upload Excel, Customize, Save locally, Download
- Sample data includes a visible `Clear` action

## V1 input methods
- Manual cell editing
- Paste tabular data from clipboard
- CSV upload
- XLSX upload

## V1 output methods
- PNG
- SVG
- CSV/data export if useful in implementation

PDF is optional later; do not block V1 on it.

## V1 saving
Save graph projects locally with IndexedDB.
A project should preserve at least:
- dataset
- graph type
- title
- axis labels
- series names
- visual settings
- graph-specific settings
- updated timestamp

UX copy should make the boundary clear: **Saved locally on this device.**

Optional project-file download/upload can be added as a backup mechanism without a database.

## Error behavior
Errors should be actionable and inline. Avoid generic toasts such as “Something went wrong.” Examples:
- incompatible data for a pie chart;
- malformed CSV;
- nonnumeric values where numeric values are required;
- empty selection after clearing sample data.

When possible, propose a one-click recovery, e.g. `Use Sales as values` for a pie chart.

## Mobile
Mobile should not be a squeezed desktop editor.
Preferred order:
1. graph preview
2. data
3. customization

Use a compact sticky action/navigation bar for primary editor modes if it improves usability.

## Accessibility
- Keyboard-accessible data entry and controls
- Visible focus states
- Accessible labels for all controls
- Do not rely on color alone to distinguish series
- Reasonable contrast
- Graph output should provide useful textual context where practical

## Long-term lanes (not V1)
- Equation/function graphing
- AI graph generation
- Network/graph-theory diagrams
- Crochet/cross-stitch/pattern graphing
- Accounts/cloud sync/collaboration
