import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter({
      pages: 'build', // Output directory for static pages
      assets: 'build', // Output directory for assets
      fallback: null, // No fallback page (not an SPA)
      precompress: false // Optional: Compress output files
    }),
    
    prerender: {
      entries: ['*'] // Prerender all routes
    },

    // This is the critical fix for GitHub Pages
    paths: {
      base: process.env.NODE_ENV === 'production' ? '/CSCI5609GP' : ''
    }
  }
};

export default config;