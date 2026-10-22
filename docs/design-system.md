# Design System & Homepage UX

## Reference
Primary visual reference: `docs/reference-homepage.png`.
Use it as direction, not as a pixel-perfect contract.

## Product aesthetic
Clean, modern data-product UI: a lightweight spreadsheet editor crossed with a polished visualization tool.

Avoid:
- generic AI landing-page gradients everywhere
- excessive glassmorphism
- decorative 3D objects
- Canva-style template overload
- Desmos-style STEM density on the generic homepage
- huge marketing hero with the actual tool below the fold

## Homepage hierarchy
1. Header
2. Compact hero copy
3. Main graph workspace above the fold
4. Popular Graph Makers
5. Three-step workflow
6. Benefits: free, no signup, private, professional output
7. Use cases
8. FAQ when content is ready
9. Footer

## Header
Suggested items:
- logo
- Graph Tools
- Guides
- Use Cases
- Saved
- primary `Create Graph` action if still useful once the editor is already visible

Keep navigation lean.

## Hero
Suggested copy direction:
- H1: `Free Online Graph Maker`
- Supporting text: create a graph from data in seconds, no signup required
- Proof points: Free to use · No watermark · No signup · Data stays in browser

Do not place a large illustration above the editor.

## Editor layout — desktop
- centered container, approximately 1280–1400 px max width
- chart-type selector across the top
- left pane approximately 40%
- right pane approximately 60%
- white graph canvas
- subtle borders and neutral surfaces
- graph carries most of the visual color

## Editor first-load state
Prefill a small, clearly labelled sample dataset.
Example:

```text
Month | Sales
Jan   | 32
Feb   | 47
Mar   | 61
Apr   | 52
```

Show `Sample data` and `Clear` controls. Replacing/pasting user data should overwrite sample data naturally.

## Data grid
Should feel spreadsheet-like, not like repeated form inputs.
Must support:
- keyboard navigation
- paste rectangular tables
- add/remove row
- add/remove series/column
- rename headers
- clear

Primary import actions:
- Paste Data
- Upload CSV
- Upload Excel

## Graph area
Large live preview with immediate update when data changes.
Primary actions visible:
- Customize
- Save locally
- Download

Do not expose advanced options in the initial state.

## Chart-type switcher
Initial visible options:
- Bar
- Line
- Pie
- XY
- Scatter
- Box Plot
- Radar
- Histogram
- Dot Plot
- Supply & Demand

The switcher is a product control. SEO links must also exist as normal HTML links elsewhere on the page.

## Progressive disclosure
Default controls:
- graph type
- data
- title
- labels
- basic appearance
- save
- download

Advanced controls belong in `Customize`, grouped by:
- Graph
- Axes
- Labels
- Legend
- Appearance

## Visual tokens
Keep tokens centralized. Initial direction:
- neutral white background
- subtle gray borders/surfaces
- one strong blue brand/accent color
- status colors only for semantic feedback
- generous whitespace
- small radius on controls/cards; avoid pill-everything design
- typography should feel utilitarian and confident, not playful

Do not hard-code arbitrary one-off values throughout components.

## Popular Graph Makers
Display crawlable cards/links for all ten existing tools:
- Bar
- Line
- Pie
- XY
- Scatter
- Box Plot
- Radar
- Histogram

Also include Dot Plot and Supply & Demand. The shared catalog owns names,
descriptions, routes, categories, and the ten distinct editor icons.

The cards should explain the job, not only repeat the keyword.

## Mobile
Use stacked editor modes rather than two compressed columns.
Preferred experience:
- graph preview
- data editor
- customization

A sticky bottom mode bar may expose `Data`, `Customize`, `Download`.

## Empty state
When sample data is cleared:
- keep the editor visually complete
- invite paste/manual/import action
- do not display an alarming error

## Error states
Use inline, local explanations near the relevant control/data area. Give a recovery action when possible.

## Editor usability update — 2026-10-20

On mobile, use a labeled native chart-type select exposing every catalog entry. Desktop uses a wrapping radio group with a single tab stop and arrow/Home/End navigation. Value edits preserve graph titles; importing replacement data retains existing adaptive-label behavior. Show one Add row action outside the table scroller. Pie customization omits axis, grid, and orientation settings; orientation is limited to bars and box plots.

The editor autosaves locally with IndexedDB. Keep Save locally as an immediate save/retry action, report successful autosaves on-device, and label the portable JSON export Download project backup. Contact email remains unset until supplied by the owner.

## Tree editor
Use the shared mobile preview/data/customization order. Each node has a labeled text field, parent select, Add child, and confirmed Remove branch. Keep raw table import in a disclosure. Customization shows graph title, tree layout, and one color. Diagram dimensions grow within the 50-node/10-level bounds; drag the canvas to pan without page overflow. Reset view restores the starting position; a focusable canvas supports arrow keys and Home. Node clicks still edit labels; drags do not open the label editor.

## Tree diagram templates
Place a six-card static template gallery immediately after the tree workspace. Use original SVG structure previews, descriptive titles, node counts and clear Use template links. A labeled native template selector in TreeInput uses the same catalog. Open presets as separate drafts and preserve the current tree in My diagrams. Both routes preserve mobile stacking and local saving.

Tree preview nodes open a nearby label form on click. A labeled node picker provides keyboard access to the same form. Save commits to the shared table and autosave; Cancel or Escape discards the draft. Blank labels cannot be saved.

Tree nodes use simple rectangular boxes with white fill, thin colored borders and centered labels; avoid stretched rounded/pill symbols.

Tree view controls provide 5–200% zoom in 25% steps, centered on the visible canvas. Keyboard +/− zoom; Home/0 and Reset view restore 100% and the starting position. Zoom is temporary and does not crop or scale downloaded diagrams.

Loading a tree template automatically fits the complete diagram inside the visible preview. Fit to view repeats this at any time; Reset view retains its 100% meaning. Narrow layouts may need zoom below 25% to display broad vertical templates.

Template selection opens a separate diagram immediately and brings the preview into view; existing work remains available in My diagrams.

Tree templates now open a separate draft on selection (DEC-021). My diagrams switches drafts without loss of labels, title or layout. The default-checked device-storage preference explains session-only behavior and removal of saved copies. No template confirmation or Load template button. A 20-draft limit asks users to delete a diagram rather than silently evict work.

## Supply-demand templates
Six static graph previews below the existing workspace pair economics concept names with scenario descriptions, numeric explanations and Use template links. The existing input pane gains progressively disclosed economics controls. Original curves use dashed/dotted styling with E1/E2; optional monochrome remains readable without color.

Supply-demand mobile refinements: compact hero and scenario cards; originals only for shifted curves; legend below plot with a reserved second row; E1/E2 point labels and a separate two-decimal price/quantity comparison. Shifts precede Original market data and are accessible through Adjust shifts.
