export interface Breadcrumb { name: string; href: string }
export const pageBreadcrumbs = (name: string, href: string): Breadcrumb[] => [{ name: 'Home', href: '/' }, { name, href }];
export const toolBreadcrumbs = (name: string, href: string): Breadcrumb[] => [
  { name: 'Home', href: '/' }, { name: 'Graph tools', href: '/tools/' }, { name, href },
];
export function breadcrumbSchema(items: Breadcrumb[], base: URL) {
  return {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({ '@type': 'ListItem', position: index + 1, name: item.name, item: new URL(item.href, base).href })),
  };
}
