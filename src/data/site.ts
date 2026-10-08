import type { UiKey } from '../i18n/utils';

export const site = {
	title: 'Mickaël Kenan',
	handle: 'mickael',
	/** GitHub login, used to fetch the contribution calendar. */
	githubUser: 'mickeiik',
	description: 'Freelance web developer.',
	url: 'https://mickeiik.github.io',
	timeZone: 'Europe/Paris',
	social: {
		github: 'https://github.com/mickeiik',
		linkedin: 'https://www.linkedin.com/in/mickael-kenan',
		email: 'mailto:dkenan.mickael@gmail.com',
	},
};

export type NavKey = 'home' | 'writing' | 'now';

export interface NavItem {
	key: NavKey;
	label: UiKey;
	/** Path without locale prefix. */
	path: string;
	/** Fixed width so the active pill can slide between items smoothly. */
	width: { en: number; fr: number };
}

/** Main navigation. Add `{ key: 'now', label: 'nav.now', path: '/now/', ... }` once the Now page exists. */
export const nav: NavItem[] = [
	{ key: 'home', label: 'nav.home', path: '/', width: { en: 80, fr: 92 } },
	{ key: 'writing', label: 'nav.writing', path: '/blog/', width: { en: 92, fr: 92 } },
];
