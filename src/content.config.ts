import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blog = defineCollection({
	// Posts live in src/content/blog/<lang>/<slug>.md (or .mdx to use components); the same slug in both folders links translations.
	loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/blog' }),
	schema: z.object({
		title: z.string(),
		description: z.string(),
		pubDate: z.coerce.date(),
		updatedDate: z.coerce.date().optional(),
		tags: z.array(z.string()).default([]),
		/** Hidden from production builds, visible in `astro dev`. */
		draft: z.boolean().default(false),
		/** Shows the "drafted with AI" note on the article. */
		aiAssisted: z.boolean().default(false),
		/** Groups posts into a series; `id` must exist in src/data/series.ts. */
		series: z.object({ id: z.string(), part: z.number().int().positive() }).optional(),
		/** Optional "written to" music card on the article. */
		soundtrack: z.object({ title: z.string(), artist: z.string(), url: z.string().url().optional() }).optional(),
	}),
});

export const collections = { blog };
