"""Emit CI evidence without API calls, secrets, or deployment actions."""
import json
import os
import re
import subprocess
import sys
from pathlib import Path

REQUIRED = {
    'verify': ['install', 'lint', 'typecheck', 'unit', 'build', 'html',
               'browser_deps', 'browser', 'e2e', 'audit', 'report_tests', 'artifacts'],
    'verify-preview': ['install', 'resolve', 'http', 'browser', 'e2e', 'artifacts'],
}


def git(*args):
    return subprocess.check_output(['git', *args], text=True).strip()


def evaluate(needs, head, artifact_sha=None):
    checks, blockers, snapshots = {}, [], {}
    for job, required in REQUIRED.items():
        source = needs.get(job, {})
        snapshot = json.loads(source.get('outputs', {}).get('snapshot') or '{}')
        snapshots[job] = snapshot
        if source.get('result') != 'success':
            blockers.append(f"{job}: {source.get('result', 'missing')}")
        for step in required:
            outcome = snapshot.get('steps', {}).get(step, {}).get('outcome', 'missing')
            checks[f'{job}/{step}'] = outcome
            if outcome != 'success':
                blockers.append(f'{job}/{step}: {outcome}')
        if not snapshot.get('tested_sha'):
            blockers.append(f'{job}: tested SHA missing')
    preview = snapshots['verify-preview']
    if artifact_sha and snapshots['verify'].get('tested_sha') != artifact_sha:
        blockers.append('Artifact test code does not match workflow SHA')
    url = preview.get('preview_url', '')
    if preview.get('tested_sha') != head:
        blockers.append('Preview test code does not match head SHA')
    if not re.fullmatch(r'https://[a-f0-9]+\.graphmaker-5k0\.pages\.dev', url):
        blockers.append('Exact-commit preview URL missing or invalid')
    return checks, blockers, snapshots


def render(report):
    lines = ['# Automation evidence', '', f"Run: {report['run_url']}", '']
    for key in ['issue', 'base_sha', 'head_sha', 'artifact_tested_sha',
                'preview_tested_sha', 'preview_url', 'code_completed', 'tested',
                'preview_verified', 'merged', 'live_deployed', 'recommendation']:
        lines.append(f'- {key}: {report[key]}')
    lines += ['', '## Checks', '', '| Check | Outcome |', '| --- | --- |']
    lines += [f'| {key} | {value} |' for key, value in report['checks'].items()]
    lines += ['', '## Changed files', '']
    lines += [f'- `{name}`' for name in report['changed_files']]
    lines += ['', '## Broken links / SEO', '', report['seo'], '', '## Blockers', '']
    lines += [f'- {item}' for item in report['blockers']] or ['- None from CI; PM scope review and owner approval remain required.']
    lines += ['', '## Manual steps', '',
              'PM reviews issue acceptance, diff, current head checks and artifacts. Owner approves any merge/release separately.',
              'This workflow performs no merge or deployment. External Cloudflare deployment status must be verified separately.', '']
    return '\n'.join(lines)


def main():
    if '--capture' in sys.argv:
        snapshot = {'steps': json.loads(os.environ['STEPS']),
                    'tested_sha': git('rev-parse', 'HEAD'),
                    'preview_url': os.environ.get('PLAYWRIGHT_BASE_URL', '')}
        with open(os.environ['GITHUB_OUTPUT'], 'a', encoding='utf-8') as output:
            output.write('snapshot=' + json.dumps(snapshot, separators=(',', ':')) + '\n')
        return 0
    event = json.loads(Path(os.environ['GITHUB_EVENT_PATH']).read_text(encoding='utf-8'))
    pr = event.get('pull_request', {})
    head = pr.get('head', {}).get('sha') or os.environ['GITHUB_SHA']
    base = pr.get('base', {}).get('sha') or event.get('before')
    checks, blockers, snapshots = evaluate(json.loads(os.environ['NEEDS']), head, os.environ['GITHUB_SHA'])
    try:
        if not base or set(base) == {'0'}:
            raise ValueError('No comparable base SHA in event')
        files = git('diff', '--name-only', base, head).splitlines()
    except (subprocess.CalledProcessError, ValueError) as error:
        files = []
        blockers.append(f'Changed files unavailable: {error}')
    body = pr.get('body') or ''
    issues = re.findall(r'(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?)\s+#(\d+)', body, re.I)
    report = {
        'schema_version': 1,
        'run_url': f"{os.environ['GITHUB_SERVER_URL']}/{os.environ['GITHUB_REPOSITORY']}/actions/runs/{os.environ['GITHUB_RUN_ID']}/attempts/{os.environ['GITHUB_RUN_ATTEMPT']}",
        'issue': ', '.join('#' + issue for issue in issues) or 'Not linked in event; see PR',
        'base_sha': base or 'unavailable', 'head_sha': head,
        'artifact_tested_sha': snapshots['verify'].get('tested_sha', 'unavailable'),
        'preview_tested_sha': snapshots['verify-preview'].get('tested_sha', 'unavailable'),
        'preview_url': snapshots['verify-preview'].get('preview_url') or 'unavailable',
        'changed_files': files, 'checks': checks, 'blockers': blockers,
        'code_completed': 'Pending PM acceptance review',
        'tested': all(checks[f'verify/{key}'] == 'success' for key in REQUIRED['verify']),
        'preview_verified': not any(item.startswith(('verify-preview', 'Preview', 'Exact-commit')) for item in blockers),
        'merged': pr.get('merged', 'unknown (non-PR event)'),
        'live_deployed': 'Not deployed by this workflow; external live status unverified',
        'seo': 'See html/http outcomes and audit-pages.md artifacts. These audits cover internal routes, canonical/SEO structure, redirects and assets; external links and ranking are not certified.',
        'recommendation': 'BLOCKED' if blockers else 'Ready for PM review; owner approval required',
    }
    dest = Path('verification-logs')
    dest.mkdir(exist_ok=True)
    (dest / 'automation-report.json').write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
    markdown = render(report)
    (dest / 'automation-report.md').write_text(markdown, encoding='utf-8')
    with open(os.environ['GITHUB_STEP_SUMMARY'], 'a', encoding='utf-8') as summary:
        summary.write(markdown)
    return int(bool(blockers))


if __name__ == '__main__':
    sys.exit(main())
