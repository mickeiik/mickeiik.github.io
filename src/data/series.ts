import type { Lang } from '../i18n/utils';

export interface Series {
	title: Record<Lang, string>;
	description: Record<Lang, string>;
}

/**
 * Series referenced by posts through `series: { id, part }` in their frontmatter.
 *
 * Example:
 *   engflow: {
 *     title: { en: 'Building Engflow', fr: 'Construire Engflow' },
 *     description: { en: '...', fr: '...' },
 *   },
 */
export const series: Record<string, Series> = {};
