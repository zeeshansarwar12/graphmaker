import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';

export default defineConfig({
  integrations: [react()],
  site: process.env.SITE_URL ?? process.env.CF_PAGES_URL ?? 'http://localhost:4321',
  trailingSlash: 'always',
  vite: {
    plugins: [tailwindcss()],
  },
});
