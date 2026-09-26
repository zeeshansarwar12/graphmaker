import type { TabularData } from '../transforms/tabularData';

function escapeCsvCell(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

export function serializeDatasetAsCsv(data: TabularData): string {
  const rows = [
    data.columns.map((column) => column.name),
    ...data.rows.map((row) => data.columns.map((_, index) => row.cells[index] ?? '')),
  ];

  return rows.map((row) => row.map(escapeCsvCell).join(',')).join('\r\n');
}

export function createDownloadFilename(title: string, extension: string): string {
  const basename = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'graph';
  return `${basename}.${extension}`;
}

function clickDownload(href: string, filename: string) {
  const anchor = document.createElement('a');
  anchor.download = filename;
  anchor.href = href;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
}

export function downloadDataUrl(dataUrl: string, filename: string) {
  clickDownload(dataUrl, filename);
}

export function downloadTextFile(content: string, filename: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  clickDownload(url, filename);
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}
