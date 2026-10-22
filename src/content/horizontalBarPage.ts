import type { ToolPageConfig } from './toolPages';

const sampleData = {
  columns: [
    { id: 'column-1', kind: 'label' as const, name: 'Priority' },
    { id: 'column-2', kind: 'number' as const, name: 'Responses' },
  ],
  rows: [
    { id: 'row-1', cells: ['Public transport', '86'] },
    { id: 'row-2', cells: ['Parks and recreation', '72'] },
    { id: 'row-3', cells: ['Street maintenance', '58'] },
    { id: 'row-4', cells: ['Library services', '41'] },
    { id: 'row-5', cells: ['Community events', '29'] },
  ],
};

export const horizontalBarToolPageConfig: ToolPageConfig = {
  canonical: '/horizontal-bar-graph-maker/', slug: '/horizontal-bar-graph-maker/',
  h1: 'Horizontal Bar Graph Maker', alternateName: ['Horizontal Bar Chart Maker'],
  connectedSchema: true,
  title: 'Horizontal Bar Graph Maker — Free Chart Tool | GraphMaker',
  metaDescription: 'Create a horizontal bar chart online for free. Compare ranked categories, edit labels and values, add grouped series, and export PNG or SVG without signup.',
  intro: 'Use this horizontal bar chart maker to compare categories with sideways bars. Start with a ranked example, edit your labels and values, and download PNG or SVG.',
  editor: { graphType: 'bar', slug: '/horizontal-bar-graph-maker/', sampleData,
    initialSettings: { orientation: 'horizontal', title: 'Community Priorities', xAxisTitle: 'Responses', yAxisTitle: '', showLegend: true, showValueLabels: true } },
  howTo: [
    { title: 'Add category labels and values', description: 'Use the first column for category names and the next column for numeric values. Replace the sample, paste a table, or upload CSV data.' },
    { title: 'Arrange your comparison', description: 'The graph follows your table order from top to bottom. Arrange the rows from largest to smallest for a ranking, or retain a meaningful category order.' },
    { title: 'Customize and download', description: 'Keep Horizontal selected in Bar orientation. Edit titles, colors and value labels in Customize, then download a PNG or SVG chart.' },
  ],
  definition: [
    'A horizontal bar graph places category names on the vertical axis and numeric values on the horizontal axis. Each bar extends sideways from zero; a longer bar represents a larger value.',
    'Horizontal bars give category labels more room than vertical columns. They work well for rankings, survey choices and named groups. Very long labels may still be shortened to fit the preview.',
    'The editor preserves your row order rather than sorting automatically. Keep ordered categories in their natural sequence; use descending values when the main message is a ranking.',
  ],
  example: { headers: ['Priority', 'Responses'], rows: sampleData.rows.map(row => [...row.cells]),
    caption: 'Illustrative response counts for community priorities, already arranged largest first. Public transport has 86 responses and parks and recreation has 72, a difference of 14. These are sample values, not survey research.' },
  comparison: { title: 'Horizontal bars vs vertical columns',
    intro: 'Both layouts compare the same values. Choose the direction that makes the categories easier to read.',
    first: { title: 'Horizontal: named categories and rankings', body: 'Use horizontal bars when category labels need room or you want to read a ranking from top to bottom. Values run left to right, and the table keeps control of category order.' },
    second: { title: 'Vertical: compact labels and discrete periods', body: 'Vertical columns can work well for short category names or separate monthly totals. Use the orientation radio buttons to compare both layouts without changing your data.' } },
  beforeComparisonSections: [{ id: 'horizontal-grouped-bars', title: 'Compare multiple series horizontally',
    intro: 'Orientation and grouping are separate choices. A horizontal chart can show one bar or several bars per category.',
    items: [
      { title: 'One series for a ranking', description: 'Keep one numeric column to compare response counts or totals across categories, as in the example above.' },
      { title: 'Add a second series', description: 'Choose Add series and enter values for a second group or period. Rename the column header so its meaning appears in the legend.' },
      { title: 'Use the same units', description: 'Grouped horizontal bars compare separate values on one scale. Keep all series in the same unit; these bars are side by side rather than stacked.' },
    ] }],
  features: [
    { title: 'Horizontal by default', description: 'Open directly in horizontal mode and switch between Vertical and Horizontal using the orientation radios.' },
    { title: 'Table-controlled order', description: 'Categories appear top to bottom in the order of your data rows, with no automatic sorting.' },
    { title: 'Grouped horizontal bars', description: 'Add numeric columns to compare two or more datasets within each category, with a named legend.' },
    { title: 'Live data editing', description: 'Edit labels and values, paste a table, or import CSV data to update the chart.' },
    { title: 'Local project saving', description: 'Your chart is saved in this browser separately from the main bar and grouped bar pages.' },
    { title: 'PNG and SVG export', description: 'Download a chart without a watermark for an assignment, report or presentation.' },
  ],
  useCases: { title: 'When to use horizontal bar charts', intro: 'Use the layout when named categories matter more than a continuous time trend.',
    items: [
      { title: 'Rank products or teams', description: 'Compare sales totals, scores or completed work. Arrange the table rows in the ranking order you want readers to see.' },
      { title: 'Compare survey choices', description: 'Show counts for clearly labeled choices. Explain whether respondents could select more than one answer.' },
      { title: 'Read longer category names', description: 'Give department, service or project labels more room beside the bars, while keeping the number of categories manageable.' },
    ] },
  faqs: [
    { question: 'How do I make a horizontal bar graph?', answer: 'Enter category labels in the first column and values in the next. This page starts with Horizontal selected. Edit the sample data, customize your chart and download PNG or SVG.' },
    { question: 'Is a horizontal bar chart the same as a sideways bar graph?', answer: 'Yes. Both names describe bars extending horizontally, with category labels on the vertical axis and values on the horizontal axis.' },
    { question: 'Does the maker sort my bars automatically?', answer: 'No. The chart follows your table order from top to bottom. Arrange rows before pasting or importing when you want a largest-to-smallest ranking.' },
    { question: 'Can I create a horizontal double bar graph?', answer: 'Yes. Choose Add series to add a second numeric column, then name the header and enter values. The chart places the two series side by side within each category.' },
    { question: 'Can I switch back to vertical bars?', answer: 'Yes. Select Vertical in Bar orientation. Your category labels, numeric values and series names stay in the table.' },
    { question: 'Can I use negative or missing values?', answer: 'Negative values extend to the left of zero. Leave a missing value blank to omit it; enter 0 only when zero is the actual observation.' },
    { question: 'Is this horizontal bar chart maker free?', answer: 'Yes. Create charts without signup and export PNG or SVG without a watermark. Graph data is processed and saved locally in your browser.' },
  ],
  relatedTools: [
    { name: 'Bar Graph Maker', href: '/bar-graph-maker/', description: 'Explore general category comparisons and vertical bar graphs.' },
    { name: 'Grouped Bar Chart Maker', href: '/grouped-bar-chart-maker/', description: 'Compare two or more datasets with double or clustered bars.' },
    { name: 'Pie Chart Maker', href: '/pie-chart-maker/', description: 'Show contributions to one whole from nonnegative values.' },
  ],
  sectionHeadings: { howTo: 'How to make a horizontal bar chart', definition: 'What is a horizontal bar graph?',
    example: 'Horizontal bar chart example', features: 'Horizontal bar graph maker features', faq: 'Horizontal bar chart questions',
    faqIntro: 'Answers about sideways bars, category order, grouped series and downloads.' },
};
