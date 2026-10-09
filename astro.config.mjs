// @ts-check
import { defineConfig, envField, fontProviders } from 'astro/config';
import mdx from '@astrojs/mdx';
import { codeFrame } from './src/lib/shiki-code-frame.mjs';

// https://astro.build/config
export default defineConfig({
	site: 'https://mickeiik.github.io',
	env: {
		schema: {
			// Reads the GitHub contribution calendar at build time (src/lib/github.ts). Optional: without it the tile is hidden.
			GITHUB_TOKEN: envField.string({ context: 'server', access: 'secret', optional: true }),
			// Base URL of the live data Worker (~/Work/mickeiik-live), read at build time and polled by the browser.
			// Optional: without it the music tile is hidden in production.
			LIVE_API_URL: envField.string({ context: 'client', access: 'public', optional: true, url: true }),
		},
	},
	i18n: {
		defaultLocale: 'en',
		locales: ['en', 'fr'],
		routing: {
			prefixDefaultLocale: false,
		},
	},
	fonts: [
		{
			provider: fontProviders.google(),
			name: 'Bricolage Grotesque',
			cssVariable: '--font-display',
			weights: ['400 800'],
			fallbacks: ['sans-serif'],
		},
		{
			provider: fontProviders.google(),
			name: 'DM Sans',
			cssVariable: '--font-body',
			weights: ['400 700'],
			fallbacks: ['sans-serif'],
		},
		{
			provider: fontProviders.google(),
			name: 'Geist Mono',
			cssVariable: '--font-mono',
			weights: [400, 500],
			fallbacks: ['monospace'],
		},
	],
	// Posts can be .mdx to use components (e.g. src/components/diagrams).
	integrations: [mdx()],
	markdown: {
		shikiConfig: {
			// Colors come from the --astro-code-* tokens in src/styles/tokens.css.
			theme: 'css-variables',
			transformers: [codeFrame()],
		},
	},
});
