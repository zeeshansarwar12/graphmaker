import { treeTemplates, findTreeTemplate } from '../../content/treeTemplates';
import type { TreeTemplate } from '../../content/treeTemplates';
import { useEffect, useState } from 'react';
import type { TabularData } from '../../graph/transforms/tabularData';
import { createTreeSampleData, treeDescendants, treeLimits } from '../../graph/transforms/tree';
import { DataGrid } from './DataGrid';

interface Props { isReady: boolean; data: TabularData; isSampleData: boolean; onChange: (data: TabularData, intent?: 'edit' | 'replace' | 'structure') => void; onApplyTemplate: (template: TreeTemplate) => void }
export default function TreeInput({ isReady, data, isSampleData, onChange, onApplyTemplate }: Props) {
  const [templateId, setTemplateId] = useState('');
  const [pendingRemoval, setPendingRemoval] = useState<string | null>(null);
  useEffect(() => {
    function readTemplateLink() {
      if(!isReady) return;
      const id = window.location.hash.startsWith('#tree-template-') ? window.location.hash.slice('#tree-template-'.length) : '';
      const template = findTreeTemplate(id);
      if (!template) return;
      setTemplateId('');
      onApplyTemplate(template);
      window.history.replaceState(null,'',`${window.location.pathname}${window.location.search}#editor`);
      setPendingRemoval(null);
      document.getElementById('data-editor')?.scrollIntoView({ block: 'start' });
    }
    const frame = window.requestAnimationFrame(readTemplateLink);
    window.addEventListener('hashchange', readTemplateLink);
    return () => { window.cancelAnimationFrame(frame); window.removeEventListener('hashchange', readTemplateLink); };
  }, [onApplyTemplate,isReady]);
  const compatible = data.columns.length === 3 && ['id', 'label', 'parent id'].every((name, index) => data.columns[index]?.name.trim().toLowerCase() === name);
  function addNode(parent: string) {
    if (data.rows.length >= treeLimits.nodes) return;
    const id = crypto.randomUUID();
    onChange({ ...data, rows: [...data.rows.filter(row => row.cells.some(cell => cell.trim())), { id: `row-${id}`, cells: [id, parent ? 'New node' : 'Root', parent] }] });
  }
  function update(index: number, column: number, value: string) {
    onChange({ ...data, rows: data.rows.map((row, i) => i === index ? { ...row, cells: row.cells.map((cell, c) => c === column ? value : cell) } : row) });
  }
  const removal = pendingRemoval ? treeDescendants(data, pendingRemoval) : new Set<string>();
  return <div>
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
      <h3 className="text-lg font-bold" id="data-heading">Tree nodes</h3>
      {isSampleData && <span className="text-brand text-sm font-semibold">Sample data</span>}
    </div>
    <p className="text-text-muted mb-4 text-sm">Give each node a label and choose its parent. One root, up to 50 nodes and 10 levels. Long labels are shortened in the drawing; the full text remains in the node editor and chart description.</p>
    <div className="border-border bg-surface-subtle mb-5 rounded-md border p-3">
      <label className="block text-sm font-semibold">Tree template<select aria-label="Tree template" className="border-border mt-2 min-h-10 w-full rounded-md border bg-white px-2 font-normal" value={templateId} onChange={event => {const template=findTreeTemplate(event.target.value);if(template)onApplyTemplate(template);setTemplateId('');}}><option value="">Choose a template…</option>{treeTemplates.map(template => <option key={template.id} value={template.id}>{template.name}</option>)}</select></label>
      <a className="text-brand ml-3 text-sm underline" href="/tree-graph-maker/#tree-templates">Preview templates</a>
    </div>
    {!compatible ? <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm"><p>Tree data needs ID, Label, and Parent ID columns. Your current table is preserved.</p><button className="button-secondary mt-2" type="button" onClick={() => onChange(createTreeSampleData(), 'replace')}>Start with sample tree</button></div> : <>
      <div className="max-h-[34rem] space-y-3 overflow-y-auto">
        {data.rows.slice(0, treeLimits.nodes).map((row, index) => {
          const [id, label, parent] = row.cells;
          const descendants = treeDescendants(data, id);
          return <fieldset className="border-border rounded-md border p-3" key={row.id}>
            <legend className="px-1 text-xs font-semibold">Node {index + 1}</legend>
            <label className="block text-sm font-semibold">Label<input aria-label={`Node ${index + 1} label`} className="border-border mt-1 min-h-10 w-full rounded-md border px-3 font-normal" maxLength={80} value={label} onChange={event => update(index, 1, event.target.value)} /></label>
            <label className="mt-2 block text-sm font-semibold">Parent<select aria-label={`Node ${index + 1} parent`} className="border-border mt-1 min-h-10 w-full rounded-md border bg-white px-2 font-normal" value={parent} onChange={event => update(index, 2, event.target.value)}>
              <option value="">No parent (root)</option>
              {data.rows.filter(candidate => !descendants.has(candidate.cells[0])).map(candidate => <option key={candidate.id} value={candidate.cells[0]}>{candidate.cells[1] || candidate.cells[0]}</option>)}
            </select></label>
            <div className="mt-3 flex flex-wrap gap-3">
              <button aria-label={`Add child to node ${index + 1}`} className="text-brand min-h-10 text-sm font-semibold" disabled={data.rows.length >= treeLimits.nodes} type="button" onClick={() => addNode(id)}>＋ Add child</button>
              <button aria-label={`Remove node ${index + 1} branch`} className="text-text-muted min-h-10 text-sm" type="button" onClick={() => setPendingRemoval(id)}>Remove branch</button>
            </div>
          </fieldset>;
        })}
      </div>
      {!data.rows.some(row => row.cells.some(cell => cell.trim())) && <button className="button-secondary" type="button" onClick={() => addNode('')}>Add root node</button>}
      {data.rows.length >= treeLimits.nodes && <p className="text-text-muted mt-2 text-sm" role="status">Node limit reached. Remove a branch to add more nodes.</p>}
    </>}
    {pendingRemoval && <div className="border-border bg-surface-subtle mt-3 rounded-md border p-3" role="alertdialog" aria-label="Remove branch confirmation">
      <p className="text-sm">Remove this node and its descendants ({removal.size} nodes)?</p>
      <div className="mt-2 flex gap-3"><button className="button-secondary" type="button" onClick={() => setPendingRemoval(null)}>Cancel</button><button className="button-primary" type="button" onClick={() => { onChange({ ...data, rows: data.rows.filter(row => !removal.has(row.cells[0].trim())) }); setPendingRemoval(null); }}>Remove branch</button></div>
    </div>}
    <details className="border-border mt-5 border-t pt-4"><summary className="cursor-pointer text-sm font-semibold">Import or edit a table</summary><p className="text-text-muted my-3 text-sm">Paste or upload three columns: ID, Label, Parent ID. IDs must be unique. Leave Parent ID blank for exactly one root. Importing replaces the tree after confirmation.</p><DataGrid data={data} isSampleData={false} onChange={onChange} headingId="tree-table-heading" /></details>
  </div>;
}
