import { getCollection, type CollectionEntry } from 'astro:content';
import { series as seriesData } from '../data/series';
import { localizePath, type Lang } from '../i18n/utils';

export type Post = CollectionEntry<'blog'>;

export const postLang = (post: Post) => post.id.split('/')[0] as Lang;
export const postSlug = (post: Post) => post.id.split('/').slice(1).join('/');
export const postUrl = (post: Post) => localizePath(`/blog/${postSlug(post)}/`, postLang(post));

/** Published posts in `lang`, newest first. Drafts are only listed during development. */
export async function getPosts(lang: Lang) {
	const posts = await getCollection(
		'blog',
		(post) => postLang(post) === lang && (import.meta.env.DEV || !post.data.draft),
	);
	return posts.sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());
}

export function readingTime(post: Post) {
	const words = post.body?.trim().split(/\s+/).length ?? 0;
	return Math.max(1, Math.round(words / 220));
}

/** The same post in another language, if it was translated. */
export async function getTranslation(post: Post, lang: Lang) {
	const posts = await getPosts(lang);
	return posts.find((p) => postSlug(p) === postSlug(post));
}

export interface SeriesInfo {
	id: string;
	title: string;
	description: string;
	parts: Post[];
}

/** Series present in `posts`, each with its parts in reading order. */
export function getSeries(posts: Post[], lang: Lang): SeriesInfo[] {
	const ids = [...new Set(posts.flatMap((p) => (p.data.series ? [p.data.series.id] : [])))];
	return ids
		.filter((id) => seriesData[id])
		.map((id) => ({
			id,
			title: seriesData[id].title[lang],
			description: seriesData[id].description[lang],
			parts: posts
				.filter((p) => p.data.series?.id === id)
				.sort((a, b) => a.data.series!.part - b.data.series!.part),
		}));
}

export function uniqueTags(posts: Post[]) {
	const counts = new Map<string, number>();
	for (const post of posts) for (const tag of post.data.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
	return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}
