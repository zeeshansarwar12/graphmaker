import type { TabularData } from '../../graph/transforms/tabularData';

interface ImportPreviewProps {
  data: TabularData;
  headerDetected: boolean;
  name: string;
  onCancel: () => void;
  onConfirm: () => void;
}

const previewRowLimit = 5;

export function ImportPreview({
  data,
  headerDetected,
  name,
  onCancel,
  onConfirm,
}: ImportPreviewProps) {
  const hiddenRowCount = Math.max(0, data.rows.length - previewRowLimit);

  return (
    <section
      aria-labelledby="import-preview-heading"
      className="border-brand/30 bg-brand-soft mt-3 rounded-md border p-3"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h4 className="font-semibold" id="import-preview-heading">Preview import</h4>
          <p className="text-text-muted mt-1 text-sm">
            {name} · {data.rows.length} row{data.rows.length === 1 ? '' : 's'} · {data.columns.length} column{data.columns.length === 1 ? '' : 's'}
            {headerDetected ? ' · Header detected' : ' · No header detected'}
          </p>
        </div>
        <div className="flex gap-2">
          <button className="button-secondary" onClick={onCancel} type="button">Cancel</button>
          <button className="button-primary" onClick={onConfirm} type="button">Replace data</button>
        </div>
      </div>

      <div className="border-border mt-3 overflow-x-auto rounded-md border bg-white">
        <table aria-label="Import preview" className="min-w-full border-collapse text-left text-sm">
          <thead className="bg-surface-subtle text-text-muted">
            <tr>
              {data.columns.map((column) => (
                <th className="border-border whitespace-nowrap border-r px-3 py-2 font-semibold last:border-r-0" key={column.id} scope="col">
                  {column.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.rows.slice(0, previewRowLimit).map((row) => (
              <tr className="border-border border-t" key={row.id}>
                {data.columns.map((column, columnIndex) => (
                  <td className="border-border whitespace-nowrap border-r px-3 py-2 last:border-r-0" key={column.id}>
                    {row.cells[columnIndex] || <span className="text-text-muted">Empty</span>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {hiddenRowCount > 0 && (
        <p className="text-text-muted mt-2 text-xs">And {hiddenRowCount} more row{hiddenRowCount === 1 ? '' : 's'}.</p>
      )}
    </section>
  );
}
