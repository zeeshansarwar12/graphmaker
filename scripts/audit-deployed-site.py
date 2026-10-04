"""Audit actual deployed responses and feed their HTML into the build auditor."""
import argparse
import concurrent.futures
import importlib.util
import json
import os
import re
import sys
from pathlib import Path
from urllib.error import HTTPError
from urllib.parse import urljoin, urlsplit
from urllib.request import HTTPRedirectHandler, Request, build_opener

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser()
parser.add_argument('base_url')
args = parser.parse_args()
BASE = args.base_url.rstrip('/')
parsed_base = urlsplit(BASE)
if parsed_base.scheme != 'https' or not parsed_base.hostname or parsed_base.path or parsed_base.query or parsed_base.fragment or parsed_base.username:
    raise SystemExit('Expected an HTTPS deployment origin without credentials or a path.')
DEST = ROOT / '.astro/preview-output'
spec = importlib.util.spec_from_file_location('built_audit', ROOT / 'scripts/audit-built-html.py')
audit = importlib.util.module_from_spec(spec)
spec.loader.exec_module(audit)
audit.DIST = DEST

class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None

def fetch(path):
    request = Request(BASE + path, headers={'User-Agent': 'GraphMaker deployment verification'})
    try:
        response = build_opener(NoRedirect).open(request, timeout=30)
    except HTTPError as response:
        return path, response.code, dict(response.headers.items()), response.read()
    with response:
        return path, response.status, dict(response.headers.items()), response.read()

def save(path, body):
    target = audit.html_path(path)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(body)

tools = sorted('/' + page.stem + '/' for page in (ROOT / 'src/pages').glob('*maker.astro'))
routes = ['/', '/tools/', '/about/', '/privacy/', '/terms/', *tools]
requests = [*routes, *[route.rstrip('/') for route in routes if route != '/'], '/deployment-check-missing-page/', '/sitemap.xml', '/robots.txt']
errors, results, assets = [], [], set()
with concurrent.futures.ThreadPoolExecutor(max_workers=8) as executor:
    fetched = list(executor.map(fetch, requests))
for path, status, headers, body in fetched:
    lower = {key.lower(): value for key, value in headers.items()}
    results.append({'path': path, 'status': status, 'location': lower.get('location'), 'x-robots-tag': lower.get('x-robots-tag')})
    if path in routes:
        if status != 200:
            errors.append(f'{path}: expected 200, got {status}')
        save(path, body)
        doc = audit.Document(body.decode()).root
        for node in doc.find():
            for attr in ['src', 'href', 'component-url', 'renderer-url', 'content']:
                value = node.attrs.get(attr)
                if not value:
                    continue
                parsed = urlsplit(urljoin(BASE + path, value))
                if parsed.netloc in [urlsplit(BASE).netloc, 'graphmaker.site'] and not parsed.path.endswith('/'):
                    if parsed.path.startswith(('/_astro/', '/images/')):
                        assets.add(parsed.path)
        assets.update(re.findall(r'(?<=["\'])/_astro/[^"\'<>\s]+', body.decode()))
    elif path == '/deployment-check-missing-page/':
        if status != 404 or b'Page not found' not in body or b'noindex' not in body:
            errors.append('Missing URL did not return custom noindex HTTP 404')
        save('/404.html', body)
    elif path in ['/sitemap.xml', '/robots.txt']:
        if status != 200:
            errors.append(f'{path}: expected 200, got {status}')
        save(path, body)
    elif status != 308 or lower.get('location') != path + '/':
        errors.append(f'{path}: expected 308 redirect to {path}/, got {status} {lower.get("location")}')
visited = set()
while assets - visited:
    pending = sorted(assets - visited)
    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as executor:
        fetched_assets = list(executor.map(fetch, pending))
    for path, status, headers, body in fetched_assets:
        visited.add(path)
        content_type = next((value for key, value in headers.items() if key.lower() == 'content-type'), '')
        results.append({'path': path, 'status': status, 'content-type': content_type})
        if status != 200:
            errors.append(f'Asset {path}: expected 200, got {status}')
        if path.endswith('.js') and 'javascript' not in content_type:
            errors.append(f'Asset {path}: incorrect JavaScript MIME type {content_type}')
        if path.endswith('.css') and 'text/css' not in content_type:
            errors.append(f'Asset {path}: incorrect CSS MIME type {content_type}')
        save(path, body)
        if path.endswith('.js') and status == 200:
            for dependency in re.findall(r'["\'](\./[^"\'\s]+\.(?:js|css))["\']', body.decode()):
                assets.add(urlsplit(urljoin(BASE + path, dependency)).path)
        if path.endswith('.css') and status == 200:
            for dependency in re.findall(r'url\(["\']?([^"\')\s]+)', body.decode()):
                parsed = urlsplit(urljoin(BASE + path, dependency))
                if parsed.netloc == parsed_base.netloc:
                    assets.add(parsed.path)
report = {'preview': BASE, 'commit': os.environ.get('COMMIT_SHA'), 'responses': results, 'errors': errors}
(ROOT / '.astro/preview-http.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
(ROOT / 'verification-logs').mkdir(exist_ok=True)
(ROOT / 'verification-logs/preview-http.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
print(f'Checked {len(routes)} page responses, {len(routes)-1} slash redirects, custom 404, sitemap, robots, and {len(assets)} assets. HTTP failures: {len(errors)}')
for error in errors:
    print(error)
if errors:
    raise SystemExit(1)
sys.argv = [sys.argv[0]]
audit.main()
