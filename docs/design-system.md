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
- More only when necessary

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
Display crawlable cards/links for the eight launch tools:
- Bar
- Line
- Pie
- XY
- Scatter
- Box Plot
- Radar
- Histogram

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
