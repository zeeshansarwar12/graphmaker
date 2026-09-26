import type { APIRoute } from 'astro';

import { indexableRoutes } from '../content/graphTools';

export const prerender = true;

export const GET: APIRoute = ({ site }) => {
  const base = site ?? new URL('https://graphmaker.site');
  const urls = indexableRoutes
    .map((route) => `  <url><loc>${new URL(route, base).href}</loc></url>`)
    .join('\n');

  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
