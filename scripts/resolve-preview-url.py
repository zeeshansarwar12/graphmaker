"""Find Cloudflare's successful preview for the exact CI commit."""
import json
import os
import re
import time
from urllib.request import Request, urlopen

repository, commit = os.environ['GITHUB_REPOSITORY'], os.environ['COMMIT_SHA']
request = Request(
    f'https://api.github.com/repos/{repository}/commits/{commit}/check-runs',
    headers={'Authorization': 'Bearer ' + os.environ['GH_TOKEN'], 'Accept': 'application/vnd.github+json', 'User-Agent': 'GraphMaker-preview-verification'},
)
for attempt in range(15):
    with urlopen(request, timeout=30) as response:
        checks = json.load(response)['check_runs']
    for check in checks:
        if check['name'] != 'Cloudflare Pages' or check['head_sha'] != commit or check['conclusion'] != 'success':
            continue
        summary = (check.get('output') or {}).get('summary') or ''
        match = re.search(r"href=['\"](https://[a-f0-9]+\.graphmaker-5k0\.pages\.dev)['\"]", summary)
        if match:
            preview = match.group(1)
            with open(os.environ['GITHUB_ENV'], 'a', encoding='utf-8') as env:
                env.write('PLAYWRIGHT_BASE_URL=' + preview + '\n')
            print(f'Verifying commit {commit} at {preview}')
            raise SystemExit(0)
    if attempt < 14:
        time.sleep(20)
raise SystemExit('No successful matching Cloudflare preview found; refusing to test a different commit.')
