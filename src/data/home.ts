import type { Lang } from '../i18n/utils';

/**
 * Live sample data is shown while running `astro dev` so the layout can be designed
 * before the Cloudflare Worker exists. Production builds hide modules without a real source.
 */
const preview = import.meta.env.DEV;

/** Which homepage tiles are rendered. Live modules turn on once their data source is connected. */
export const homeModules = {
	music: preview,
	clock: true,
	building: preview,
	reading: preview,
	/** Hidden automatically when the build has no GitHub data (src/lib/github.ts). */
	github: true,
};

/**
 * How many recent posts the homepage shows (one featured, the rest as small tiles).
 * Kept at 1 so the grid has the same tiles in every language, whatever each one has published;
 * the "All writing" tile leads to the rest.
 */
export const homePostCount = 1;

/** Curated "what I'm building" tile. */
export const building: { name: string; status: Record<Lang, string>; href?: string } = {
	name: 'Engflow',
	status: { en: 'building, scaffold stage', fr: 'en construction, premières briques' },
};
