import type { TabularData } from './tabularData';

export const treeLimits = { nodes: 50, levels: 10, label: 80 } as const;
export interface TreeNode { id: string; name: string; children: TreeNode[] }
export type TreeResult = { status: 'empty' | 'invalid'; message: string } | { status: 'ready'; root: TreeNode; count: number; levels: number; leaves: number; summary: string };

export function createTreeSampleData(): TabularData {
  return {
    columns: ['ID', 'Label', 'Parent ID'].map((name, index) => ({ id: `tree-column-${index}`, name, kind: 'label' })),
    rows: [['root', 'Project', ''], ['plan', 'Planning', 'root'], ['build', 'Development', 'root'], ['research', 'Research', 'plan'], ['design', 'Design', 'plan'], ['test', 'Testing', 'build']].map((cells, index) => ({ id: `tree-row-${index}`, cells })),
  };
}

export function createTreeData(data: TabularData): TreeResult {
  const rows = data.rows.filter(row => row.cells.some(cell => cell.trim()));
  if (!rows.length) return { status: 'empty', message: 'Add a root node, then add its children to start your tree.' };
  if (data.columns.length !== 3 || !['id', 'label', 'parent id'].every((name, index) => data.columns[index]?.name.trim().toLowerCase() === name)) return { status: 'invalid', message: 'Use three columns in this order: ID, Label, Parent ID. Leave Parent ID blank only for the root.' };
  if (rows.length > treeLimits.nodes) return { status: 'invalid', message: `Use at most ${treeLimits.nodes} nodes per tree.` };
  const nodes = new Map<string, TreeNode>();
  const parents = new Map<string, string>();
  for (const [index, row] of rows.entries()) {
    const [id, name, parent] = row.cells.map(cell => cell.trim());
    if (!id || !name) return { status: 'invalid', message: `Row ${index + 1} needs an ID and a label.` };
    if (id.length > 80 || name.length > treeLimits.label) return { status: 'invalid', message: `IDs and labels must be at most ${treeLimits.label} characters.` };
    if (nodes.has(id)) return { status: 'invalid', message: `Duplicate node ID: ${id}. Give each node a unique ID.` };
    if (id === parent) return { status: 'invalid', message: `Node ${id} cannot be its own parent.` };
    nodes.set(id, { id, name, children: [] }); parents.set(id, parent ?? '');
  }
  const roots = [...nodes.keys()].filter(id => !parents.get(id));
  if (roots.length !== 1) return { status: 'invalid', message: 'Use exactly one root: leave Parent ID blank for one node only.' };
  for (const [id, parent] of parents) {
    if (parent && !nodes.has(parent)) return { status: 'invalid', message: `Parent ${parent} for node ${id} does not exist. Use an ID from another row.` };
    const visited = new Set<string>();
    let current = id;
    while (current) {
      if (visited.has(current)) return { status: 'invalid', message: 'This tree contains a cycle. A node cannot descend from itself.' };
      visited.add(current); current = parents.get(current) ?? '';
    }
    if (parent) nodes.get(parent)!.children.push(nodes.get(id)!);
  }
  const root = nodes.get(roots[0])!;
  let levels = 0, leaves = 0;
  const queue = [{ node: root, depth: 1 }];
  for (let index = 0; index < queue.length; index++) {
    const { node, depth } = queue[index];
    levels = Math.max(levels, depth);
    if (!node.children.length) leaves++;
    for (const child of node.children) queue.push({ node: child, depth: depth + 1 });
  }
  if (levels > treeLimits.levels) return { status: 'invalid', message: `Use at most ${treeLimits.levels} levels per tree.` };
  const relationships = [...nodes.values()].map(node => `${node.name}: ${node.children.length ? node.children.map(child => child.name).join(', ') : 'leaf'}`).join('. ');
  return { status: 'ready', root, count: nodes.size, leaves, levels, summary: `Tree with ${nodes.size} ${nodes.size === 1 ? 'node' : 'nodes'} and ${levels} ${levels === 1 ? 'level' : 'levels'}. Root: ${root.name}. ${relationships}` };
}

export function treeDescendants(data: TabularData, id: string): Set<string> {
  const found = new Set([id]);
  let previous = 0;
  while (previous !== found.size) {
    previous = found.size;
    for (const row of data.rows) if (found.has(row.cells[2]?.trim())) found.add(row.cells[0]?.trim());
  }
  return found;
}
