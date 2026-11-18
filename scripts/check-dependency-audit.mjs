import { spawnSync } from 'node:child_process';
import console from 'node:console';
import { readFileSync } from 'node:fs';
import process from 'node:process';
import { URL } from 'node:url';

const windows = process.platform === 'win32';
const audit = spawnSync(windows ? 'npm.cmd audit --audit-level=high --json' : 'npm',
  windows ? [] : ['audit', '--audit-level=high', '--json'], {
  encoding: 'utf8',
  maxBuffer: 32 * 1024 * 1024,
  shell: windows,
});
process.stdout.write(audit.stdout ?? '');
process.stderr.write(audit.stderr ?? '');
if (audit.error || ![0, 1].includes(audit.status)) throw new Error('npm audit could not complete.', { cause: audit.error });
const report = JSON.parse(audit.stdout);
if (report.error || !report.vulnerabilities || !report.metadata?.vulnerabilities) {
  throw new Error('npm audit did not return a complete advisory report.');
}

const allowlist = JSON.parse(readFileSync(new URL('../.audit-allowlist.json', import.meta.url), 'utf8'));
if (!Array.isArray(allowlist)) throw new Error('The audit allowlist must be an array.');
const today = new Date().toISOString().slice(0, 10);
const latest = new Date(Date.parse(today) + 60 * 86400000).toISOString().slice(0, 10);
const allowed = new Set();

for (const entry of allowlist) {
  const { id, reason, expires } = entry;
  const date = typeof expires === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(expires) ? new Date(expires) : null;
  if (!/^GHSA(?:-[a-z0-9]{4}){3}$/.test(id) || allowed.has(id) || typeof reason !== 'string' || !reason.trim()
    || !date || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== expires) {
    throw new Error('Invalid or duplicate audit allowlist entry.');
  }
  if (expires <= today || expires > latest) throw new Error(`Audit allowlist entry ${id} is expired or exceeds 60 days.`);
  allowed.add(id);
}

const blocked = [];
const isBlocking = severity => severity === 'high' || severity === 'critical';
for (const [name, finding] of Object.entries(report.vulnerabilities)) {
  for (const advisory of finding.via) {
    if (typeof advisory === 'string') {
      if (!report.vulnerabilities[advisory]) blocked.push(`${name}: unresolved advisory dependency ${advisory}`);
      continue;
    }
    if (!isBlocking(advisory.severity)) continue;
    const id = advisory.url?.match(/\bGHSA(?:-[a-z0-9]{4}){3}\b/)?.[0];
    if (!id || !allowed.has(id)) blocked.push(`${name}: ${id ?? advisory.title} (${advisory.severity})`);
  }
}
if (blocked.length) {
  console.error('Unallowlisted audit findings:\n' + [...new Set(blocked)].join('\n'));
  process.exitCode = 1;
}
