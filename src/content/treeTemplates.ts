import type { TabularData } from '../graph/transforms/tabularData';
import { createTreeSampleData } from '../graph/transforms/tree';

export interface TreeTemplate {
  id: string;
  name: string;
  title: string;
  description: string;
  orientation: 'horizontal' | 'vertical';
  rows: ReadonlyArray<readonly [string, string, string]>;
}
export const treeTemplates: readonly TreeTemplate[] = [
  { id: 'blank', name: 'Blank hierarchy', title: 'My tree diagram', description: 'A root and two branches for your own topic. Rename the labels and grow the tree.', orientation: 'vertical', rows: [['root', 'Your topic', ''], ['a', 'Branch 1', 'root'], ['b', 'Branch 2', 'root']] },
  { id: 'project', name: 'Project plan', title: 'Project tree', description: 'Break a project into planning, development, research, design, and testing tasks.', orientation: 'horizontal', rows: createTreeSampleData().rows.map(row => row.cells as [string, string, string]) },
  { id: 'organization', name: 'Organization chart', title: 'Team structure', description: 'Map one reporting parent per role across product, operations, and marketing teams.', orientation: 'vertical', rows: [['company', 'Company', ''], ['product', 'Product', 'company'], ['operations', 'Operations', 'company'], ['marketing', 'Marketing', 'company'], ['design', 'Design team', 'product'], ['engineering', 'Engineering', 'product'], ['support', 'Support team', 'operations'], ['content', 'Content team', 'marketing']] },
  { id: 'decision', name: 'Decision outline', title: 'Decision outline', description: 'Sketch a choice and its outcomes with labeled nodes. No probability or expected-value calculations.', orientation: 'horizontal', rows: [['choice', 'Need quick results?', ''], ['yes', 'Yes: paid campaign', 'choice'], ['no', 'No: organic growth', 'choice'], ['search', 'Search advertising', 'yes'], ['social', 'Social advertising', 'yes'], ['guides', 'Publish useful guides', 'no'], ['community', 'Build a community', 'no']] },
  { id: 'website', name: 'Website structure', title: 'Website structure', description: 'Plan products, resources, and company pages as a simple website navigation tree.', orientation: 'vertical', rows: [['site', 'Website', ''], ['products', 'Products', 'site'], ['resources', 'Resources', 'site'], ['company', 'Company', 'site'], ['product-a', 'Product A', 'products'], ['product-b', 'Product B', 'products'], ['guides', 'Guides', 'resources'], ['blog', 'Blog', 'resources'], ['about', 'About', 'company'], ['contact', 'Contact', 'company']] },
  { id: 'classification', name: 'Classification tree', title: 'Transport categories', description: 'Group a topic into categories and examples. Useful for lessons and classification exercises.', orientation: 'vertical', rows: [['transport', 'Transport', ''], ['land', 'Land', 'transport'], ['air', 'Air', 'transport'], ['water', 'Water', 'transport'], ['car', 'Car', 'land'], ['bicycle', 'Bicycle', 'land'], ['airplane', 'Airplane', 'air'], ['helicopter', 'Helicopter', 'air'], ['boat', 'Boat', 'water'], ['ferry', 'Ferry', 'water']] },
];

export function findTreeTemplate(id: string): TreeTemplate | undefined {
  return treeTemplates.find(template => template.id === id);
}

export function createTreeTemplateData(template: TreeTemplate): TabularData {
  return {
    columns: ['ID', 'Label', 'Parent ID'].map((name, index) => ({ id: `tree-column-${index}`, name, kind: 'label' })),
    rows: template.rows.map((cells, index) => ({ id: `template-row-${index}`, cells: [...cells] })),
  };
}
