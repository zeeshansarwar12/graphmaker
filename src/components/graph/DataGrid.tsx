import { useMemo, useRef, useState } from 'react';
import type { ChangeEvent, ClipboardEvent, KeyboardEvent } from 'react';

import {
  addColumn,
  addRow,
  clearData,
  createDataFromClipboard,
  parseClipboardTable,
  pasteRectangularData,
  removeColumn,
  removeRow,
  renameColumn,
  rowsHaveHeader,
  updateCell,
  validateData,
} from '../../graph/transforms/tabularData';
import type { TabularData } from '../../graph/transforms/tabularData';
import type { TabularImportResult } from '../../lib/import/tabularImport';
import { ImportPreview } from './ImportPreview';

interface DataGridProps {
  data: TabularData;
  isSampleData: boolean;
  onChange: (data: TabularData, intent?: 'edit' | 'replace' | 'structure') => void;
}

interface PendingImport {
  data: TabularData;
  headerDetected: boolean;
  name: string;
}

type ClipboardWithRead = Pick<Clipboard, 'readText'> & Partial<Pick<Clipboard, 'read'>>;

async function readClipboardText(clipboard: ClipboardWithRead): Promise<string> {
  try {
    return await clipboard.readText();
  } catch (readTextError) {
    if (!clipboard.read) throw readTextError;

    try {
      const items = await clipboard.read();
      for (const item of items) {
        if (!item.types.includes('text/plain')) continue;
        return await (await item.getType('text/plain')).text();
      }
      return '';
    } catch {
      throw readTextError;
    }
  }
}

function clipboardReadErrorMessage(error: unknown): string {
  if (!window.isSecureContext) {
    return 'Clipboard access requires HTTPS or localhost. Open this site over a secure connection and try again.';
  }
  if (!document.hasFocus()) {
    return 'Clipboard access requires the active browser tab. Focus this tab and choose Paste data again.';
  }
  if (error instanceof DOMException && error.name === 'NotAllowedError') {
    return 'The browser blocked programmatic clipboard reading for this page. Check this site’s clipboard permission or paste directly into a selected cell.';
  }
  return 'The clipboard could not be read. Paste directly into a selected cell, or try the Paste data button again.';
}

export function DataGrid({ data, isSampleData, onChange }: DataGridProps) {
  const csvInputRef = useRef<HTMLInputElement>(null);
  const excelInputRef = useRef<HTMLInputElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [pendingImport, setPendingImport] = useState<PendingImport | null>(null);
  const issues = useMemo(() => validateData(data), [data]);
  const issueMap = useMemo(
    () => new Map(issues.map((issue) => [`${issue.rowId}:${issue.columnId}`, issue])),
    [issues],
  );

  function commit(nextData: TabularData, intent: 'edit' | 'replace' | 'structure' = 'edit') {
    setImportMessage(null);
    setImportError(null);
    setPendingImport(null);
    onChange(nextData, intent);
  }

  function presentImport(result: TabularImportResult, name: string) {
    setImportMessage(null);
    if (!result.ok) {
      setPendingImport(null);
      setImportError(result.error);
      return;
    }

    setImportError(null);
    setPendingImport({
      data: result.data,
      headerDetected: result.headerDetected,
      name,
    });
  }

  function focusCell(rowIndex: number, columnIndex: number) {
    if (rowIndex < 0 || columnIndex < 0) return;
    const input = gridRef.current?.querySelector<HTMLInputElement>(
      `[data-grid-cell="${rowIndex}-${columnIndex}"]`,
    );
    input?.focus();
    input?.select();
  }

  function handleCellKeyDown(
    event: KeyboardEvent<HTMLInputElement>,
    rowIndex: number,
    columnIndex: number,
  ) {
    const destinations: Partial<Record<string, [number, number]>> = {
      ArrowDown: [rowIndex + 1, columnIndex],
      ArrowLeft: [rowIndex, columnIndex - 1],
      ArrowRight: [rowIndex, columnIndex + 1],
      ArrowUp: [rowIndex - 1, columnIndex],
      Enter: [rowIndex + (event.shiftKey ? -1 : 1), columnIndex],
      Home: [rowIndex, 0],
      End: [rowIndex, data.columns.length - 1],
    };
    const destination = destinations[event.key];
    if (!destination) return;

    const [nextRow, nextColumn] = destination;
    if (nextRow < 0 || nextRow >= data.rows.length || nextColumn < 0 || nextColumn >= data.columns.length) return;

    event.preventDefault();
    focusCell(nextRow, nextColumn);
  }

  function applyPastedText(text: string, rowIndex: number, columnIndex: number) {
    const result = parseClipboardTable(text);
    if (!result.ok) {
      setImportMessage(null);
      setImportError(result.error);
      return;
    }

    const replacesDataset = rowIndex === 0 && columnIndex === 0 && rowsHaveHeader(result.rows);
    onChange(
      replacesDataset ? createDataFromClipboard(result.rows) : pasteRectangularData(data, result.rows, rowIndex, columnIndex),
      replacesDataset ? 'replace' : 'edit',
    );
    setPendingImport(null);
    setImportError(null);
    setImportMessage(`Pasted ${result.rows.length} row${result.rows.length === 1 ? '' : 's'} into the grid.`);
  }

  function handleCellPaste(
    event: ClipboardEvent<HTMLInputElement>,
    rowIndex: number,
    columnIndex: number,
  ) {
    event.preventDefault();
    applyPastedText(event.clipboardData.getData('text/plain'), rowIndex, columnIndex);
  }

  async function pasteFromClipboard() {
    if (!navigator.clipboard?.readText) {
      setImportError('Clipboard access is unavailable. Select a cell and press Ctrl+V or Command+V instead.');
      return;
    }

    setImportError(null);
    setImportMessage(null);
    setIsImporting(true);
    let text: string;
    try {
      window.focus();
      text = await readClipboardText(navigator.clipboard as ClipboardWithRead);
    } catch (error) {
      setPendingImport(null);
      setImportError(clipboardReadErrorMessage(error));
      setIsImporting(false);
      return;
    }

    const result = parseClipboardTable(text);
    if (!result.ok) {
      setPendingImport(null);
      setImportError(result.error);
      setIsImporting(false);
      return;
    }

    presentImport({
      data: createDataFromClipboard(result.rows),
      headerDetected: rowsHaveHeader(result.rows),
      ok: true,
    }, 'Clipboard data');
    setIsImporting(false);
  }

  async function handleCsvFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setIsImporting(true);
    setImportError(null);
    setImportMessage(null);
    try {
      const [{ parseCsvText }, text] = await Promise.all([
        import('../../lib/import/tabularImport'),
        file.text(),
      ]);
      presentImport(parseCsvText(text), file.name);
    } catch {
      setPendingImport(null);
      setImportError('This CSV file could not be opened. Choose another file and try again.');
    } finally {
      setIsImporting(false);
    }
  }

  async function handleExcelFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setIsImporting(true);
    setImportError(null);
    setImportMessage(null);
    try {
      const [{ parseXlsxBuffer }, buffer] = await Promise.all([
        import('../../lib/import/tabularImport'),
        file.arrayBuffer(),
      ]);
      presentImport(await parseXlsxBuffer(buffer), file.name);
    } catch {
      setPendingImport(null);
      setImportError('This Excel file could not be opened. Choose another XLSX file and try again.');
    } finally {
      setIsImporting(false);
    }
  }

  function confirmImport() {
    if (!pendingImport) return;
    const imported = pendingImport;
    onChange(imported.data, 'replace');
    setPendingImport(null);
    setImportError(null);
    setImportMessage(`Imported ${imported.data.rows.length} row${imported.data.rows.length === 1 ? '' : 's'} from ${imported.name}.`);
  }

  return (
    <div ref={gridRef}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-lg font-bold" id="data-heading">Data</h3>
        <div className="flex items-center gap-3 text-sm">
          {isSampleData && <span className="text-brand font-semibold">Sample data</span>}
          <button className="text-text-muted hover:text-text font-medium" onClick={() => commit(clearData(data), 'structure')} type="button">Clear</button>
        </div>
      </div>

      <div className="border-border max-h-[32rem] overflow-auto rounded-md border">
        <table
          aria-label="Graph data"
          className="w-full table-fixed border-collapse text-left text-sm"
          style={{ minWidth: `${Math.max(26, data.columns.length * 9 + 5)}rem` }}
        >
          <thead className="bg-surface-subtle text-text-muted">
            <tr>
              <th aria-label="Row number" className="border-border w-10 border-r px-2 py-2 text-center font-medium" scope="col"></th>
              {data.columns.map((column, columnIndex) => (
                <th className="border-border border-r p-1 font-semibold last:border-r-0" key={column.id} scope="col">
                  <div className="flex items-center gap-1">
                    <input
                      aria-label={`Rename ${column.name || `column ${columnIndex + 1}`} header`}
                      className="focus:border-brand min-w-0 flex-1 rounded-sm border border-transparent bg-transparent px-2 py-1.5 font-semibold outline-none"
                      onChange={(event) => commit(renameColumn(data, column.id, event.target.value), 'structure')}
                      spellCheck="false"
                      value={column.name}
                    />
                    {columnIndex > 0 && (
                      <button
                        aria-label={`Remove ${column.name || `column ${columnIndex + 1}`}`}
                        className="text-text-muted hover:text-rose-600 grid h-7 w-7 shrink-0 place-items-center rounded-sm"
                        onClick={() => commit(removeColumn(data, column.id), 'structure')}
                        title="Remove column"
                        type="button"
                      >
                        <span aria-hidden="true">×</span>
                      </button>
                    )}
                  </div>
                </th>
              ))}
              <th aria-label="Row actions" className="w-10 px-1 py-2" scope="col"></th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row, rowIndex) => (
              <tr className="border-border border-t" key={row.id}>
                <th className="border-border bg-surface-subtle text-text-muted border-r px-2 py-2 text-center font-normal" scope="row">{rowIndex + 1}</th>
                {data.columns.map((column, columnIndex) => {
                  const issue = issueMap.get(`${row.id}:${column.id}`);
                  const issueId = `issue-${row.id}-${column.id}`;

                  return (
                    <td className="border-border border-r p-0 last:border-r-0" key={column.id}>
                      <input
                        aria-describedby={issue ? issueId : undefined}
                        aria-invalid={issue ? 'true' : undefined}
                        aria-label={`${column.name || `Column ${columnIndex + 1}`}, row ${rowIndex + 1}`}
                        className={issue
                          ? 'bg-rose-50 text-rose-900 focus:ring-rose-400 h-10 w-full min-w-0 px-3 outline-none focus:ring-2 focus:ring-inset'
                          : 'focus:ring-brand h-10 w-full min-w-0 bg-white px-3 outline-none focus:ring-2 focus:ring-inset'}
                        data-grid-cell={`${rowIndex}-${columnIndex}`}
                        inputMode={column.kind === 'number' ? 'decimal' : 'text'}
                        onChange={(event) => commit(updateCell(data, row.id, column.id, event.target.value))}
                        onKeyDown={(event) => handleCellKeyDown(event, rowIndex, columnIndex)}
                        onPaste={(event) => handleCellPaste(event, rowIndex, columnIndex)}
                        spellCheck="false"
                        value={row.cells[columnIndex] ?? ''}
                      />
                      {issue && <span className="sr-only" id={issueId}>{issue.message}</span>}
                    </td>
                  );
                })}
                <td className="bg-surface-subtle p-1 text-center">
                  <button
                    aria-label={`Remove row ${rowIndex + 1}`}
                    className="text-text-muted hover:text-rose-600 grid h-8 w-8 place-items-center rounded-sm"
                    onClick={() => commit(removeRow(data, row.id), 'structure')}
                    title="Remove row"
                    type="button"
                  >
                    <span aria-hidden="true">×</span>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {data.rows.length === 0 && (
          <div className="text-text-muted px-4 py-6 text-center text-sm">No rows yet. Add a row or paste your data to begin.</div>
        )}

        <button className="border-border text-text-muted hover:bg-surface-subtle w-full border-t px-3 py-2 text-left text-sm font-medium" onClick={() => commit(addRow(data), 'structure')} type="button">
          <span aria-hidden="true">＋</span> Add row
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button className="button-secondary" onClick={() => commit(addRow(data), 'structure')} type="button"><span aria-hidden="true" className="text-brand">＋</span>Add row</button>
        <button className="button-secondary" onClick={() => commit(addColumn(data), 'structure')} type="button"><span aria-hidden="true" className="text-brand">＋</span>Add series</button>
      </div>

      <div className="border-border mt-5 grid gap-2 border-t pt-4 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
        <button className="button-secondary justify-center" disabled={isImporting} onClick={pasteFromClipboard} type="button"><span aria-hidden="true" className="text-brand">▣</span>Paste data</button>
        <button className="button-secondary justify-center" disabled={isImporting} onClick={() => csvInputRef.current?.click()} type="button"><span aria-hidden="true" className="text-brand">▤</span>Upload CSV</button>
        <button className="button-secondary justify-center" disabled={isImporting} onClick={() => excelInputRef.current?.click()} type="button"><span aria-hidden="true" className="text-brand">▦</span>Upload Excel</button>
        <input
          accept=".csv,text/csv"
          aria-label="Choose CSV file"
          hidden
          onChange={handleCsvFile}
          ref={csvInputRef}
          type="file"
        />
        <input
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          aria-label="Choose XLSX file"
          hidden
          onChange={handleExcelFile}
          ref={excelInputRef}
          type="file"
        />
      </div>
      <p className="text-text-muted mt-2 text-xs">Your data is processed in your browser.</p>
      {isImporting && <p className="text-text-muted mt-2 text-sm" role="status">Reading file…</p>}

      {pendingImport && (
        <ImportPreview
          data={pendingImport.data}
          headerDetected={pendingImport.headerDetected}
          name={pendingImport.name}
          onCancel={() => setPendingImport(null)}
          onConfirm={confirmImport}
        />
      )}

      {importError && <p className="mt-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800" role="alert">{importError}</p>}
      {importMessage && <p className="text-success mt-3 text-sm font-medium" role="status">{importMessage}</p>}
    </div>
  );
}
