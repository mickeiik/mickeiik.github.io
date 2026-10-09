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
export const series: Record<string, Series> = {
	engflow: {
		title: { en: 'Building Engflow', fr: 'Construire Engflow' },
		description: {
			en: 'Building an environment to run, observe, and compare coding-agent workflows.',
			fr: "Construire un environnement pour lancer, observer et comparer des workflows d'agents de code.",
		},
	},
};
