export const defaultLang = 'en';

export const languages = {
	en: 'English',
	fr: 'Français',
};

export const ui = {
	en: {
		'nav.home': 'Home',
		'nav.blog': 'Blog',
		'home.kicker': 'Hi, my name is',
		'home.tagline': 'I build things for the web.',
		'home.intro':
			"I'm a freelance web developer based in France. I enjoy turning ideas into fast, clean, and reliable products.",
		'home.github': 'GitHub',
		'home.linkedin': 'LinkedIn',
		'home.latest': 'Latest posts',
		'home.all': 'All posts →',
		'blog.kicker': 'Blog',
		'blog.title': 'Posts',
		'blog.back': 'Blog',
		'post.updated': 'updated',
	},
	fr: {
		'nav.home': 'Accueil',
		'nav.blog': 'Blog',
		'home.kicker': "Bonjour, je m'appelle",
		'home.tagline': 'Je construis des choses pour le web.',
		'home.intro':
			"Je suis développeur web freelance basé en France. J'aime transformer des idées en produits rapides, propres et fiables.",
		'home.github': 'GitHub',
		'home.linkedin': 'LinkedIn',
		'home.latest': 'Derniers articles',
		'home.all': 'Tous les articles →',
		'blog.kicker': 'Blog',
		'blog.title': 'Articles',
		'blog.back': 'Blog',
		'post.updated': 'mis à jour',
	},
} as const;
