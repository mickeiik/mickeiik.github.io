import type { Lang } from './utils';

/**
 * Text printed by the site shell (src/components/layout/Terminal.astro, src/scripts/terminal.ts).
 * `{name}` placeholders are filled by the script. Command names stay in English in both languages.
 */

export interface ShellCommand {
	name: string;
	args?: string;
	help: Record<Lang, string>;
}

/** Listed by `help` and offered by Tab completion, in this order. */
export const shellCommands: ShellCommand[] = [
	{ name: 'help', help: { en: 'list the commands', fr: 'liste les commandes' } },
	{ name: 'whoami', help: { en: 'who runs this place', fr: 'qui tient cet endroit' } },
	{ name: 'ls', args: '[writing|series|tags]', help: { en: 'list posts, series or tags', fr: 'liste les articles, séries ou étiquettes' } },
	{ name: 'cat', args: '<post>', help: { en: 'show what a post is about', fr: 'résume un article' } },
	{ name: 'open', args: '<post|github|linkedin|email>', help: { en: 'open a post or a link', fr: 'ouvre un article ou un lien' } },
	{ name: 'cd', args: '<~|writing|..|fr|en>', help: { en: 'go to a page or a language', fr: 'va sur une page ou change de langue' } },
	{ name: 'grep', args: '<text|#tag>', help: { en: 'search titles, summaries and tags', fr: 'cherche dans les titres, résumés et étiquettes' } },
	{ name: 'tags', help: { en: 'every tag, with its post count', fr: "toutes les étiquettes, avec leur nombre d'articles" } },
	{ name: 'now', help: { en: "what I'm listening to", fr: "ce que j'écoute" } },
	{ name: 'date', help: { en: 'local time in France', fr: 'heure locale en France' } },
	{ name: 'pwd', help: { en: 'where you are', fr: 'où vous êtes' } },
	{ name: 'history', help: { en: 'what you typed', fr: 'ce que vous avez tapé' } },
	{ name: 'clear', help: { en: 'clean the screen (ctrl L)', fr: "nettoie l'écran (ctrl L)" } },
	{ name: 'exit', help: { en: 'close the shell (esc)', fr: 'ferme le terminal (échap)' } },
];

/** Chips under the screen, for touch screens and the curious. */
export const shellSuggestions = ['help', 'ls', 'now', 'whoami', 'tags'];

export const shellStrings = {
	en: {
		motd: 'Welcome to ~/{handle}. Type {help} to look around. Tab completes, ↑ recalls, esc leaves.',
		try: 'try',
		posts: '{n} posts',
		post: '1 post',
		matches: '{n} matches',
		match: '1 match',
		here: '← you are here',
		part: 'part {part} of {total}',
		minutes: '{n} min',
		openIt: 'open it',
		opening: 'opening {target}',
		notFound: 'command not found: {name}',
		didYouMean: 'did you mean {name}?',
		noPost: '{cmd}: no such post: {name}',
		ambiguous: '{cmd}: {name} could be:',
		usage: 'usage: {usage}',
		noMatch: 'grep: no match for {q}',
		noDir: 'cd: no such directory: {name}',
		noLs: 'ls: cannot access {name}: no such directory',
		sameLang: 'cd: already reading in {lang}',
		emptyHistory: 'history is empty, for now',
		nowLoading: 'asking the phone...',
		nowNone: 'nothing played yet, the phone is quiet',
		nowOff: 'now: no signal, the live feed is not set up here',
		nowError: 'now: no answer from the phone, try again later',
		nowPlayer: 'the full player is on the homepage',
		dateFrance: 'France',
		dateYours: 'yours',
		sudo: '{handle} is not in the sudoers file. This incident will be reported.',
		rmAll: 'nice try.',
		rm: 'rm: read-only file system',
		vim: "you'd never get out. Type exit instead.",
		quit: "you're not in vim, but I appreciate the reflex.",
		hello: 'hi! type {cmd} to see who I am.',
	},
	fr: {
		motd: 'Bienvenue dans ~/{handle}. Tapez {help} pour explorer. Tab complète, ↑ rappelle, échap ferme.',
		try: 'essayez',
		posts: '{n} articles',
		post: '1 article',
		matches: '{n} résultats',
		match: '1 résultat',
		here: '← vous êtes ici',
		part: 'partie {part} sur {total}',
		minutes: '{n} min',
		openIt: "l'ouvrir",
		opening: 'ouverture de {target}',
		notFound: 'commande introuvable : {name}',
		didYouMean: 'vouliez-vous dire {name} ?',
		noPost: '{cmd} : aucun article nommé {name}',
		ambiguous: '{cmd} : {name} peut désigner :',
		usage: 'usage : {usage}',
		noMatch: 'grep : aucun résultat pour {q}',
		noDir: 'cd : dossier introuvable : {name}',
		noLs: "ls : impossible d'accéder à {name} : dossier introuvable",
		sameLang: 'cd : vous lisez déjà en {lang}',
		emptyHistory: "l'historique est vide, pour l'instant",
		nowLoading: 'je demande au téléphone...',
		nowNone: 'rien écouté pour le moment, le téléphone est silencieux',
		nowOff: "now : pas de signal, le flux en direct n'est pas configuré ici",
		nowError: 'now : le téléphone ne répond pas, réessayez plus tard',
		nowPlayer: "le lecteur complet est sur l'accueil",
		dateFrance: 'France',
		dateYours: 'chez vous',
		sudo: "{handle} n'est pas dans le fichier sudoers. Cet incident sera signalé.",
		rmAll: 'bien essayé.',
		rm: 'rm : système de fichiers en lecture seule',
		vim: "vous n'en sortiriez jamais. Tapez plutôt exit.",
		quit: "vous n'êtes pas dans vim, mais j'apprécie le réflexe.",
		hello: 'salut ! tapez {cmd} pour savoir qui je suis.',
	},
} satisfies Record<Lang, Record<string, string>>;

export type ShellStrings = (typeof shellStrings)['en'];
