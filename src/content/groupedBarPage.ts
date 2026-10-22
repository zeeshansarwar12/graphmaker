import type { ToolPageConfig } from './toolPages';

const sampleData = {
  columns: [
    { id: 'column-1', kind: 'label' as const, name: 'Subject' },
    { id: 'column-2', kind: 'number' as const, name: 'Class A' },
    { id: 'column-3', kind: 'number' as const, name: 'Class B' },
  ],
  rows: [
    { id: 'row-1', cells: ['Math', '78', '85'] },
    { id: 'row-2', cells: ['Science', '86', '80'] },
    { id: 'row-3', cells: ['English', '82', '88'] },
    { id: 'row-4', cells: ['History', '74', '79'] },
  ],
};

export const groupedBarToolPageConfig: ToolPageConfig = {
  connectedSchema: true,
  canonical: '/grouped-bar-chart-maker/',
  slug: '/grouped-bar-chart-maker/',
  h1: 'Grouped Bar Graph Maker',
  alternateName: ['Grouped Bar Chart Maker'],
  title: 'Grouped Bar Chart Maker — Double & Multiple | GraphMaker',
  metaDescription: 'Create grouped or double bar graphs online. Compare two or more datasets side by side, edit the legend, and download PNG or SVG for free.',
  intro: 'Use this grouped bar chart maker to compare two or more datasets side by side. Start with a double bar graph, add series, and download your chart for free.',
  editor: {
    graphType: 'bar', slug: '/grouped-bar-chart-maker/', sampleData,
    initialSettings: { orientation: 'vertical', showLegend: true, showValueLabels: true,
      title: 'Class Scores by Subject', xAxisTitle: 'Subject', yAxisTitle: 'Average score (points)' },
  },
  howTo: [
    { title: 'Align the categories', description: 'Put category names in the first column. Each row should describe the same category for every dataset, such as Math scores for both classes.' },
    { title: 'Name each dataset', description: 'Use two numeric columns for a double bar graph. Rename their headers for the legend, or choose Add series for a third or fourth dataset.' },
    { title: 'Compare and download', description: 'Keep measurements in the same unit. Customize colors, orientation and labels, then export PNG or SVG for your assignment or report.' },
  ],
  definition: [
    'A grouped bar chart places a separate bar for each dataset beside the other bars in its category. Also called a clustered or multiple bar graph, it helps you compare individual values across groups.',
    'A double bar graph has exactly two series per category. Triple and quadruple bar graphs use three and four series. They all use the same grouped layout; add a numeric column for each series.',
    'Compare like-for-like measures on a shared scale. Scores in points can be compared with other scores in points; combining revenue in dollars with profit margins in percent would give misleading bar lengths.',
  ],
  example: { headers: ['Subject', 'Class A', 'Class B'], rows: sampleData.rows.map(row => [...row.cells]),
    caption: 'Illustrative average scores, measured in points. Class B leads Math by 7 points, while Class A leads Science by 6. These are example values, not research data.' },
  comparison: {
    title: 'Grouped vs stacked bar charts',
    intro: 'Choose the layout based on the comparison you need to make.',
    first: { title: 'Grouped: compare individual values', body: 'Side-by-side bars share a baseline, making Class A and Class B easy to compare within each subject. Use this layout for separate groups or periods measured in the same unit.' },
    second: { title: 'Stacked: show parts of a total', body: 'Stacked charts join component values into one bar. Use them when the components form a meaningful total, such as spending categories within a budget. Adding two class averages does not create a useful total. This page creates grouped bars.' },
  },
  beforeComparisonSections: [{
    id: 'series-guide', title: 'Double, triple, or multiple bars?',
    intro: 'Choose the number of series in the data table. A category stays on one row as you add comparison columns.',
    items: [
      { title: 'Double bar graph', description: 'Two numeric columns create a pair of bars per category. Compare this year with last year, or two classes across the same subjects.' },
      { title: 'Triple or quadruple bar graph', description: 'Choose Add series once or twice to compare three or four datasets. Give every column a descriptive header and use consistent units.' },
      { title: 'Multiple or clustered bars', description: 'These describe the same grouped layout. With many series, hide some through the legend or compare fewer groups to keep the chart readable.' },
    ],
  }],
  features: [
    { title: 'Side-by-side comparisons', description: 'Each dataset gets its own bar within each category, sharing the same value axis.' },
    { title: 'Named series and legend', description: 'Column headers identify the series. Use the legend to show or hide individual datasets.' },
    { title: 'Two or more series', description: 'Start with two classes and use Add series to extend the comparison without changing tools.' },
    { title: 'Horizontal or vertical', description: 'Choose horizontal bars in Customize when category names need more room.' },
    { title: 'Editable sample data', description: 'Replace the sample values, paste your own table, or upload a CSV. The grouped chart updates as you edit.' },
    { title: 'PNG and SVG downloads', description: 'Export your comparison without a watermark. Work is saved locally on this device.' },
  ],
  useCases: {
    title: 'What can you compare?', intro: 'Use matched categories and the same measurement unit for each dataset.',
    items: [
      { title: 'Class scores by subject', description: 'Compare two classes in Math, Science and English using average scores in points, as in the starting example.' },
      { title: 'Sales across periods', description: 'Put products on rows and each year in its own numeric column. Compare sales measured in the same currency.' },
      { title: 'Survey groups', description: 'Compare response counts for two groups across the same answer choices. If group sizes differ, consider whether raw counts answer your question.' },
    ],
  },
  faqs: [
    { question: 'How do I make a double bar graph?', answer: 'Keep category labels in the first column and enter the two datasets in the next two columns. The starting example already uses this structure. Rename the headers to label each series in the legend.' },
    { question: 'Are grouped and clustered bar charts the same?', answer: 'Yes. Grouped, clustered and side-by-side describe the same arrangement here. A double bar graph is a grouped chart with two series.' },
    { question: 'Can I create triple and quadruple bar graphs?', answer: 'Yes. Choose Add series to add a numeric column, then name it and enter a value for each category. Three numeric columns produce three bars per category; four produce four.' },
    { question: 'Can the datasets have different units?', answer: 'Use the same unit for all series on this shared value axis. Comparing dollars with percentages or counts with averages would make the bar lengths difficult to interpret.' },
    { question: 'How do I make a horizontal grouped bar graph?', answer: 'Open Customize and change Orientation to Horizontal. Your categories, values and series names stay in place.' },
    { question: 'What happens when a value is missing?', answer: 'Leave a missing value blank. It is omitted rather than treated as zero. Enter 0 only when zero is the actual observation.' },
    { question: 'Is this grouped bar graph maker free?', answer: 'Yes. Create and download PNG or SVG charts without signup or a watermark. The grouped page saves its work separately from the main bar graph page, locally in your browser.' },
  ],
  relatedTools: [
    { name: 'Horizontal Bar Chart Maker', href: '/horizontal-bar-graph-maker/', description: 'Compare categories with sideways bars and a horizontal value axis.' },
    { name: 'Bar Graph Maker', href: '/bar-graph-maker/', description: 'Start with general category comparisons and explore bar graph layouts.' },
    { name: 'Line Graph Maker', href: '/line-graph-maker/', description: 'Compare series when the main message is change over time.' },
    { name: 'Pie Chart Maker', href: '/pie-chart-maker/', description: 'Show how one set of nonnegative values contributes to a whole.' },
  ],
  sectionHeadings: {
    howTo: 'How to make a grouped bar chart', definition: 'What is a grouped bar chart?',
    example: 'Double bar graph example', features: 'Grouped bar graph maker features',
    faq: 'Grouped and double bar graph questions', faqIntro: 'Practical answers about series, categories and side-by-side comparisons.',
  },
};
