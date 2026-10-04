"""Audit the actual Astro dist output using only Python's standard library.

Run after npm run build: python scripts/audit-built-html.py
Use --inventory to print existing JSON-LD without applying the new audit rules.
"""
import argparse
import json
import re
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urljoin, urlsplit
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / 'dist'
ORIGIN = 'https://graphmaker.site'
VOID = set('area base br col embed hr img input link meta param source track wbr'.split())


class Node:
    def __init__(self, tag='', attrs=None):
        self.tag, self.attrs, self.children = tag, dict(attrs or []), []

    def find(self, tag=None, **attrs):
        found = []
        if (tag is None or self.tag == tag) and all(self.attrs.get(k) == v for k, v in attrs.items()):
            found.append(self)
        for child in self.children:
            if isinstance(child, Node):
                found.extend(child.find(tag, **attrs))
        return found

    def text(self):
        return ''.join(child.text() if isinstance(child, Node) else child for child in self.children)


class Document(HTMLParser):
    def __init__(self, raw):
        super().__init__(convert_charrefs=True)
        self.root = Node()
        self.stack = [self.root]
        self.feed(raw)

    def handle_starttag(self, tag, attrs):
        node = Node(tag, attrs)
        self.stack[-1].children.append(node)
        if tag not in VOID:
            self.stack.append(node)

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        if tag not in VOID:
            self.handle_endtag(tag)

    def handle_endtag(self, tag):
        for index in range(len(self.stack) - 1, 0, -1):
            if self.stack[index].tag == tag:
                del self.stack[index:]
                break

    def handle_data(self, data):
        self.stack[-1].children.append(data)


def flatten_schema(value):
    if isinstance(value, list):
        return [item for entry in value for item in flatten_schema(entry)]
    if isinstance(value, dict) and '@graph' in value:
        return flatten_schema(value['@graph'])
    return [value]


def html_path(path):
    path = unquote(path).lstrip('/')
    candidate = DIST / path
    if not path or path.endswith('/'):
        candidate /= 'index.html'
    elif candidate.is_dir():
        candidate /= 'index.html'
    if not candidate.exists() and path == '404/':
        candidate = DIST / '404.html'
    return candidate


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--inventory', action='store_true')
    args = parser.parse_args()
    tools = sorted('/' + page.stem + '/' for page in (ROOT / 'src/pages').glob('*maker.astro'))
    routes = ['/', '/tools/', '/about/', '/privacy/', '/terms/', *tools]
    missing = [route for route in routes if not html_path(route).is_file()]
    if missing:
        raise SystemExit('Cannot audit built HTML; build is missing these pages: ' + ', '.join(missing))
    assert len(routes) == 15 and len(tools) == 10
    errors, rows, docs = [], [], {}

    def check(condition, message):
        if not condition:
            errors.append(message)

    for file in DIST.rglob('*.html'):
        raw = file.read_text(encoding='utf-8')
        check(not re.search(r'\[PLACEHOLDER\b|example\.com|lorem ipsum', raw, re.I), f'{file.relative_to(DIST)}: production placeholder present')
        docs[file.resolve()] = Document(raw).root
    not_found = docs.get((DIST / '404.html').resolve())
    check(not_found is not None, 'Missing custom 404 page')
    if not_found:
        check(any('noindex' in node.attrs.get('content', '') for node in not_found.find('meta', name='robots')), '404 page must be noindex')

    for route in routes:
        path = html_path(route)
        raw = path.read_text(encoding='utf-8')
        doc = docs[path.resolve()]

        def meta(key, attribute='name'):
            values = doc.find('meta', **{attribute: key})
            return values[0].attrs.get('content', '') if len(values) == 1 else ''

        title_nodes = doc.find('title')
        title = title_nodes[0].text() if len(title_nodes) == 1 else ''
        description, robots = meta('description'), meta('robots')
        canonicals = doc.find('link', rel='canonical')
        canonical = canonicals[0].attrs.get('href', '') if len(canonicals) == 1 else ''
        schemas = []
        for script in doc.find('script', type='application/ld+json'):
            try:
                schemas.extend(flatten_schema(json.loads(script.text())))
            except (ValueError, TypeError) as error:
                errors.append(f'{route}: invalid JSON-LD: {error}')
        types = [schema.get('@type', '') for schema in schemas if isinstance(schema, dict)]
        image = meta('og:image', 'property')
        rows.append([route, str(len(title)), str(len(description)), canonical, robots, 'yes' if image else 'no', ', '.join(types)])
        if args.inventory:
            continue
        check(len(doc.find('h1')) == 1, f'{route}: expected exactly one H1')
        check(0 < len(title) <= 60, f'{route}: title exceeds 60 characters or is missing')
        check('noindex' in robots or 70 <= len(description) <= 160, f'{route}: description outside 70–160 characters')
        check(canonical == ORIGIN + route == meta('og:url', 'property'), f'{route}: canonical/og:url/slash mismatch')
        check(title == meta('og:title', 'property'), f'{route}: title and og:title differ')
        check(bool(image) and bool(meta('twitter:image')), f'{route}: social image missing')
        check(meta('twitter:card') == 'summary_large_image', f'{route}: small Twitter card')
        for image_url in [image, meta('twitter:image')]:
            parsed = urlsplit(image_url)
            check(parsed.netloc == 'graphmaker.site' and html_path(parsed.path).is_file(), f'{route}: social image asset missing')
        check('width=device-width' in meta('viewport') and 'initial-scale=1' in meta('viewport'), f'{route}: viewport incomplete')
        check(not meta('generator'), f'{route}: generator metadata present')
        check(meta('og:site_name', 'property') == 'GraphMaker' and meta('og:locale', 'property') == 'en_US', f'{route}: site metadata incomplete')
        check(not re.search(r'\bV1\b|\bplanned\b|GraphEditor', raw), f'{route}: stale/internal text in HTML')
        for key in ['google-site-verification', 'msvalidate.01']:
            check(bool(meta(key)) == (route == '/'), f'{route}: verification tag scope incorrect')
        footers = doc.find('footer')
        footer_links = {node.attrs.get('href') for footer in footers for node in footer.find('a')}
        check(set(tools) <= footer_links, f'{route}: footer misses graph tools')
        if route == '/' or route in tools:
            groups = doc.find('div', **{'aria-label': 'Choose a graph type'})
            buttons = groups[0].find('button') if len(groups) == 1 else []
            icons = [icon.text() for button in buttons for icon in button.find('span') if 'data-chart-icon' in icon.attrs]
            check(len(buttons) == 10 and len(icons) == len(set(icons)) == 10, f'{route}: expected 10 tabs with distinct icons')
        if route in ['/privacy/', '/terms/']:
            check(robots == 'noindex,follow', f'{route}: legal page must remain noindex')
        for schema in schemas:
            check(isinstance(schema, dict) and schema.get('@context') == 'https://schema.org', f'{route}: schema context missing')
            check('aggregateRating' not in schema and 'potentialAction' not in schema, f'{route}: unexpected rating/SearchAction')
        by_type = {schema.get('@type'): schema for schema in schemas if isinstance(schema, dict)}
        if route in tools:
            app = by_type.get('WebApplication', {})
            intro = doc.find('main')[0].find('p')[0].text()
            check(app.get('name') == doc.find('h1')[0].text() and app.get('url') == canonical and app.get('description') == intro, f'{route}: application schema differs from content')
            check(app.get('applicationCategory') == 'BusinessApplication' and app.get('operatingSystem') == 'Any', f'{route}: application schema fields missing')
            check(app.get('offers', {}).get('price') == 0 and app.get('offers', {}).get('priceCurrency') == 'USD', f'{route}: application offer incorrect')
        if route == '/':
            check({'WebSite', 'Organization'} <= set(types), 'Homepage: missing WebSite/Organization')
            for kind in ['WebSite', 'Organization']:
                schema = by_type.get(kind, {})
                check(schema.get('name') == 'GraphMaker' and schema.get('url') == canonical, f'Homepage: incorrect {kind}')
        else:
            navs = doc.find('nav', **{'aria-label': 'Breadcrumb'})
            visible = [li.text().strip() for nav in navs for li in nav.find('li') if li.attrs.get('aria-hidden') != 'true']
            items = by_type.get('BreadcrumbList', {}).get('itemListElement', [])
            check([item.get('name') for item in items] == visible and len(visible) >= 2, f'{route}: breadcrumb schema differs from visible trail')
            expected_hrefs = ['/', '/tools/', route] if route in tools else ['/', route]
            check([item.get('item') for item in items] == [ORIGIN + href for href in expected_hrefs], f'{route}: breadcrumb URLs incorrect')
            check([item.get('position') for item in items] == list(range(1, len(items) + 1)), f'{route}: breadcrumb positions incorrect')
        if route == '/tools/':
            items = by_type.get('ItemList', {}).get('itemListElement', [])
            check(len(items) == 10 and {item.get('url') for item in items} == {ORIGIN + tool for tool in tools}, '/tools/: ItemList misses tools')
            visible_links = {(a.text().strip(), ORIGIN + a.attrs.get('href', '')) for a in doc.find('a')}
            check(all((item.get('name'), item.get('url')) in visible_links for item in items), '/tools/: ItemList names differ from visible content')

    table = '| Page | Title length | Description length | Canonical | Robots | og:image | JSON-LD types |\n|---|---:|---:|---|---|---|---|\n' + '\n'.join('| ' + ' | '.join(row) + ' |' for row in rows)
    print(table)
    if args.inventory:
        raise SystemExit(1 if errors else 0)
    checked = 0
    for source, doc in docs.items():
        relative = source.relative_to(DIST)
        route = '/' + relative.as_posix().removesuffix('index.html')
        for anchor in doc.find('a'):
            href = anchor.attrs.get('href', '')
            url = urlsplit(urljoin(ORIGIN + route, href))
            if url.scheme != 'https' or url.netloc != 'graphmaker.site':
                continue
            checked += 1
            target = html_path(url.path)
            check(target.is_file(), f'{route}: broken internal link {href}')
            if url.fragment and target.resolve() in docs:
                check(bool(docs[target.resolve()].find(id=unquote(url.fragment))), f'{route}: missing link fragment {href}')
    sitemap = ET.parse(DIST / 'sitemap.xml')
    locations = {node.text for node in sitemap.findall('.//{*}loc')}
    check(locations == {ORIGIN + route for route in routes if route not in ['/privacy/', '/terms/']}, 'Sitemap URLs differ from indexable pages')
    report = table + f'\n\nChecked {checked} internal links.\n' + ('\n'.join(errors) if errors else 'All built HTML assertions passed. Zero broken internal links.') + '\n'
    (ROOT / 'docs/audit-pages.md').write_text(report, encoding='utf-8')
    print(f'\nChecked {checked} internal links. {len(errors)} audit failures.')
    for error in errors:
        print(error)
    raise SystemExit(1 if errors else 0)


if __name__ == '__main__':
    main()
