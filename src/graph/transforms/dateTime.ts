export type DateAxisGranularity = 'day' | 'month' | 'year';

const isoPattern = /^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d+))?)?(Z|[+-]\d{2}:?\d{2})?)?$/;
const yearFirstPattern = /^(\d{4})\/(\d{1,2})\/(\d{1,2})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/;
const monthFirstPattern = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/;
const namedMonthPattern = /^(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4}(?:\s+\d{1,2}:\d{2}(?::\d{2})?)?$/i;

function validUtcParts(year: number, month: number, day: number, hour = 0, minute = 0, second = 0): boolean {
  if (hour > 23 || minute > 59 || second > 59) return false;
  const date = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day
    && date.getUTCHours() === hour
    && date.getUTCMinutes() === minute
    && date.getUTCSeconds() === second;
}

function utcTimestamp(parts: RegExpMatchArray, order: 'month-first' | 'year-first'): number | null {
  const year = Number(order === 'year-first' ? parts[1] : parts[3]);
  const month = Number(order === 'year-first' ? parts[2] : parts[1]);
  const day = Number(order === 'year-first' ? parts[3] : parts[2]);
  const offset = 4;
  const hour = Number(parts[offset] ?? 0);
  const minute = Number(parts[offset + 1] ?? 0);
  const second = Number(parts[offset + 2] ?? 0);
  return validUtcParts(year, month, day, hour, minute, second)
    ? Date.UTC(year, month - 1, day, hour, minute, second)
    : null;
}

export function parseDateValue(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const iso = trimmed.match(isoPattern);
  if (iso) {
    const year = Number(iso[1]);
    const month = Number(iso[2]);
    const day = Number(iso[3]);
    const hour = Number(iso[4] ?? 0);
    const minute = Number(iso[5] ?? 0);
    const second = Number(iso[6] ?? 0);
    if (!validUtcParts(year, month, day, hour, minute, second)) return null;
    const timestamp = iso[8]
      ? Date.parse(trimmed)
      : Date.UTC(year, month - 1, day, hour, minute, second, Number(`0.${iso[7] ?? ''}`) * 1000);
    return Number.isFinite(timestamp) ? timestamp : null;
  }

  const yearFirst = trimmed.match(yearFirstPattern);
  if (yearFirst) return utcTimestamp(yearFirst, 'year-first');
  const monthFirst = trimmed.match(monthFirstPattern);
  if (monthFirst) return utcTimestamp(monthFirst, 'month-first');
  if (namedMonthPattern.test(trimmed)) {
    const timestamp = Date.parse(`${trimmed} UTC`);
    return Number.isFinite(timestamp) ? timestamp : null;
  }
  return null;
}

export function dateAxisGranularity(timestamps: readonly number[]): DateAxisGranularity {
  if (timestamps.length < 2) return 'day';
  const ordered = [...timestamps].sort((a, b) => a - b);
  const intervals = ordered.slice(1).map((value, index) => value - ordered[index]).filter((value) => value > 0);
  if (intervals.length === 0) return 'day';
  const median = [...intervals].sort((a, b) => a - b)[Math.floor(intervals.length / 2)];
  const day = 86_400_000;
  if (median >= 300 * day) return 'year';
  if (median >= 25 * day) return 'month';
  return 'day';
}

export function formatDateAxisLabel(
  timestamp: number,
  granularity: DateAxisGranularity,
  spansMultipleYears: boolean,
): string {
  const date = new Date(timestamp);
  if (granularity === 'year') return String(date.getUTCFullYear());
  if (granularity === 'month') {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      timeZone: 'UTC',
      year: 'numeric',
    }).format(date);
  }
  return new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
    ...(spansMultipleYears ? { year: 'numeric' as const } : {}),
  }).format(date);
}

export function formatTooltipDate(timestamp: number): string {
  const date = new Date(timestamp);
  const dateText = new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
    year: 'numeric',
  }).format(date);
  const hasTime = date.getUTCHours() !== 0 || date.getUTCMinutes() !== 0 || date.getUTCSeconds() !== 0;
  if (!hasTime) return dateText;
  return `${dateText}, ${new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'UTC',
  }).format(date)} UTC`;
}
