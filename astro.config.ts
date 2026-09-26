import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';

export default defineConfig({
  integrations: [react()],
  site: 'https://graphmaker.site',
  trailingSlash: 'always',
  vite: {
    plugins: [tailwindcss()],
  },
});
