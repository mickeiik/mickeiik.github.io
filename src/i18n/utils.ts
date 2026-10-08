import { defaultLang, languages, ui } from './ui';

export type Lang = keyof typeof languages;
export type UiKey = keyof (typeof ui)[typeof defaultLang];

export const langs = Object.keys(languages) as Lang[];

export function isLang(value: string | undefined): value is Lang {
	return !!value && value in languages;
}

/** Returns a translator for `lang`. `{name}` placeholders are filled from `vars`. */
export function useTranslations(lang: Lang) {
	return function t(key: UiKey, vars: Record<string, string | number> = {}) {
		const template: string = ui[lang][key] ?? ui[defaultLang][key];
		return template.replace(/\{(\w+)\}/g, (_, name) => String(vars[name] ?? `{${name}}`));
	};
}

/** Prefixes a root-relative path with the locale segment (none for the default language). */
export function localizePath(path: string, lang: Lang) {
	const clean = path.startsWith('/') ? path : `/${path}`;
	return lang === defaultLang ? clean : `/${lang}${clean}`;
}

export function otherLang(lang: Lang): Lang {
	return langs.find((l) => l !== lang) ?? defaultLang;
}

/** Same page in another language, assuming routes mirror each other across locales. */
export function translatePath(pathname: string, from: Lang, to: Lang) {
	const bare = from === defaultLang ? pathname : pathname.replace(new RegExp(`^/${from}(?=/|$)`), '') || '/';
	return localizePath(bare, to);
}

export function formatDate(date: Date, lang: Lang, style: 'long' | 'iso' = 'long') {
	if (style === 'iso') return date.toISOString().slice(0, 10);
	return date.toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}
