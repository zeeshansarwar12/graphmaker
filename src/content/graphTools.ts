import type { GraphType } from '../graph/configs/editor';

// Single catalog for navigation, cards, and the editor type selector.
const tools = [
  { name: 'Bar Graph Maker', label: 'Bar', slug: 'bar-graph-maker', description: 'Compare values clearly across categories.', type: 'bar', icon: '▥', category: 'Compare categories' },
  { name: 'Line Graph Maker', label: 'Line', slug: 'line-graph-maker', description: 'Show trends and changes over time.', type: 'line', icon: '⌁', category: 'Show change' },
  { name: 'Pie Chart Maker', label: 'Pie', slug: 'pie-chart-maker', description: 'Show how values make up a whole.', type: 'pie', icon: '◕', category: 'Show composition' },
  { name: 'XY Graph Maker', label: 'XY', slug: 'xy-graph-maker', description: 'Plot paired X and Y values precisely.', type: 'xy', icon: '⌗', category: 'Explore relationships' },
  { name: 'Equation Graph Maker', label: 'Equation', slug: 'equation-graph-maker', description: 'Graph mathematical expressions directly on coordinate axes.', type: 'equation', icon: 'ƒ', category: 'Explore relationships' },
  { name: 'Scatter Plot Maker', label: 'Scatter', slug: 'scatter-plot-maker', description: 'Explore relationships and trends.', type: 'scatter', icon: '⠿', category: 'Explore relationships' },
  { name: 'Histogram Maker', label: 'Histogram', slug: 'histogram-maker', description: 'See the shape of a numeric distribution.', type: 'histogram', icon: '▟', category: 'Understand distributions' },
  { name: 'Box Plot Maker', label: 'Box Plot', slug: 'box-plot-maker', description: 'Summarize spread, quartiles, and outliers.', type: 'boxplot', icon: '▣', category: 'Understand distributions' },
  { name: 'Radar Chart Maker', label: 'Radar', slug: 'radar-chart-maker', description: 'Compare several metrics across profiles.', type: 'radar', icon: '⬡', category: 'Compare profiles' },
  { name: 'Dot Plot Maker', label: 'Dot Plot', slug: 'dot-plot-maker', description: 'Stack repeated observations on a true numeric scale.', type: 'dotplot', icon: '⠇', category: 'Understand distributions' },
  { name: 'Supply and Demand Graph Maker', label: 'Supply & Demand', slug: 'supply-and-demand-graph-maker', description: 'Plot economics curves and estimate equilibrium.', type: 'supplydemand', icon: '⇄', category: 'Explore economics' },
  { name: 'Tree Diagram Maker', label: 'Tree', slug: 'tree-graph-maker', description: 'Create tree diagrams and charts from editable templates.', type: 'tree', icon: '⑂', category: 'Organize hierarchies' },
] as const satisfies ReadonlyArray<{ name: string; label: string; slug: string; description: string; type: GraphType; icon: string; category: string }>;

export const graphTools = tools.map((tool) => ({ ...tool, href: `/${tool.slug}/` }));
// Bar workflow pages share the Bar engine; do not duplicate editor type controls.
export const barWorkflowTools = [
  { name: 'Stacked Bar Graph Maker', label: 'Stacked bar', slug: 'stacked-bar-graph-maker', href: '/stacked-bar-graph-maker/', description: 'Show component values and totals in segmented bars.', type: 'bar' as const, icon: '▥', category: 'Show composition' },
  { name: 'Horizontal Bar Graph Maker', label: 'Horizontal bar', slug: 'horizontal-bar-graph-maker', href: '/horizontal-bar-graph-maker/', description: 'Compare rankings and named categories with sideways bars.', type: 'bar' as const, icon: '▥', category: 'Compare categories' },
  { name: 'Grouped Bar Graph Maker', label: 'Grouped bar', slug: 'grouped-bar-chart-maker', href: '/grouped-bar-chart-maker/', description: 'Compare two or more datasets side by side.', type: 'bar' as const, icon: '▥', category: 'Compare categories' },
];
export const allGraphTools = [...graphTools, ...barWorkflowTools];

export const indexableRoutes = [
  '/',
  '/tools/',
  '/about/',
  ...allGraphTools.map((tool) => tool.href),
] as const;
