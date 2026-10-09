/**
 * The site shell (src/components/layout/Terminal.astro).
 *
 * Commands read the post list rendered into the dialog at build time, and `now` asks the live
 * Worker like the music card does. Clickable output (slugs, tags, chips) types its command out
 * before running it, so visitors on a phone can explore without a keyboard.
 * History survives page changes and language switches through sessionStorage.
 */
import { navigate } from 'astro:transitions/client';
import type { Track } from '../lib/live';
import { relativeTime } from './relative-time';

interface ShellPost {
	slug: string;
	title: string;
	description: string;
	date: string;
	minutes: number;
	tags: string[];
	url: string;
}

interface ShellData {
	lang: string;
	otherLang: string;
	handle: string;
	name: string;
	tagline: string;
	home: string;
	writing: string;
	timeZone: string;
	musicUrl?: string;
	links: { github: string; linkedin: string; email: string };
	posts: ShellPost[];
	series: { title: string; parts: string[] }[];
	commands: { name: string; args?: string; help: string }[];
	strings: Record<string, string>;
}

/** A piece of output: plain text, or styled text that may run a command when clicked. */
type Part = string | { text: string; tone?: string; run?: string; mark?: string };

type Place = { kind: 'home' | 'writing' | 'other'; path: string } | { kind: 'article'; path: string; slug: string };

const HISTORY_KEY = 'mk-shell-history';
const HISTORY_MAX = 50;
const CLOSE_MS = 220;

const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = () => matchMedia('(pointer: fine)').matches;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, reduceMotion() ? 0 : ms));

function loadHistory(): string[] {
	try {
		return JSON.parse(sessionStorage.getItem(HISTORY_KEY) ?? '[]');
	} catch {
		return [];
	}
}

function saveHistory(history: string[]) {
	try {
		sessionStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(-HISTORY_MAX)));
	} catch {
		// Private mode or storage blocked: history lasts until the page changes language.
	}
}

/** Splits a command line on spaces, keeping "quoted words" together. */
function tokenize(line: string) {
	return (line.match(/"[^"]*"|'[^']*'|\S+/g) ?? []).map((token) => token.replace(/^(["'])(.*)\1$/, '$2'));
}

function distance(a: string, b: string) {
	const row = Array.from({ length: b.length + 1 }, (_, i) => i);
	for (let i = 1; i <= a.length; i++) {
		let previous = row[0];
		row[0] = i;
		for (let j = 1; j <= b.length; j++) {
			const current = row[j];
			row[j] = Math.min(row[j] + 1, row[j - 1] + 1, previous + (a[i - 1] === b[j - 1] ? 0 : 1));
			previous = current;
		}
	}
	return row[b.length];
}

function commonPrefix(words: string[]) {
	return words.reduce((prefix, word) => {
		let i = 0;
		while (i < prefix.length && prefix[i] === word[i]) i++;
		return prefix.slice(0, i);
	});
}

/** Appends `text` to `parent`, wrapping each case-insensitive occurrence of `mark` in <mark>. */
function appendMarked(parent: HTMLElement, text: string, mark?: string) {
	const needle = mark?.toLowerCase();
	if (!needle) {
		parent.append(text);
		return;
	}
	const lower = text.toLowerCase();
	let from = 0;
	for (let at = lower.indexOf(needle); at !== -1; at = lower.indexOf(needle, from)) {
		parent.append(text.slice(from, at));
		const hit = document.createElement('mark');
		hit.textContent = text.slice(at, at + needle.length);
		parent.append(hit);
		from = at + needle.length;
	}
	parent.append(text.slice(from));
}

class Shell {
	private readonly data: ShellData;
	private readonly s: Record<string, string>;
	private readonly screen: HTMLElement;
	private readonly log: HTMLElement;
	private readonly input: HTMLInputElement;
	private readonly ps1: HTMLElement;
	private readonly cwd: HTMLElement;
	private readonly commands: Record<string, (args: string[]) => void | Promise<void>>;
	private block: HTMLElement | null = null;
	private history = loadHistory();
	private recall = -1;
	private draft = '';
	private busy = false;
	private booted = false;

	constructor(private readonly dialog: HTMLDialogElement) {
		this.data = JSON.parse(dialog.querySelector('[data-term-data]')!.textContent!);
		this.s = this.data.strings;
		this.screen = dialog.querySelector('[data-term-screen]')!;
		this.log = dialog.querySelector('[data-term-log]')!;
		this.input = dialog.querySelector('[data-term-input]')!;
		this.ps1 = dialog.querySelector('[data-term-ps1]')!;
		this.cwd = dialog.querySelector('[data-term-cwd]')!;

		const help = () => this.help();
		const ls = (args: string[]) => this.ls(args);
		const cat = (args: string[]) => this.cat(args);
		const open = (args: string[]) => this.openTarget(args);
		const grep = (args: string[]) => this.grep(args);
		const exit = () => this.close();
		const whoami = () => this.whoami();
		const vim = () => this.print({ text: this.s.vim, tone: 't-muted' });
		const quit = () => this.print({ text: this.s.quit, tone: 't-muted' });
		const hello = () => this.print(this.fill(this.s.hello, { cmd: { text: 'whoami', tone: 't-link', run: 'whoami' } }));

		this.commands = {
			help,
			man: help,
			whoami,
			about: whoami,
			ls,
			ll: ls,
			dir: ls,
			cat,
			less: cat,
			more: cat,
			open,
			'xdg-open': open,
			cd: (args) => this.cd(args),
			grep,
			find: grep,
			search: grep,
			tags: () => this.tags(),
			now: () => this.now(),
			music: () => this.now(),
			date: () => this.date(),
			pwd: () => this.print({ text: this.place().path, tone: 't-text' }),
			history: () => this.showHistory(),
			echo: (args) => this.print(args.join(' ')),
			clear: () => this.clear(),
			cls: () => this.clear(),
			exit,
			quit: exit,
			logout: exit,
			sudo: () => this.print({ text: this.s.sudo.replace('{handle}', this.data.handle), tone: 't-err' }),
			rm: (args) =>
				args.some((arg) => /^-\w*r\w*f|^-\w*f\w*r/.test(arg))
					? this.print({ text: this.s.rmAll, tone: 't-err' })
					: this.print({ text: this.s.rm, tone: 't-err' }),
			vim,
			vi: vim,
			nvim: vim,
			nano: vim,
			emacs: vim,
			':q': quit,
			':wq': quit,
			':q!': quit,
			hello,
			hi: hello,
			bonjour: hello,
			salut: hello,
		};

		this.dialog.addEventListener('cancel', (event) => {
			event.preventDefault();
			this.close();
		});

		// A click on the backdrop lands on the dialog itself, outside its box.
		this.dialog.addEventListener('click', (event) => {
			const box = this.dialog.getBoundingClientRect();
			const outside =
				event.target === this.dialog &&
				(event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom);
			const target = event.target as HTMLElement;
			const run = target.closest<HTMLElement>('[data-run]');
			if (outside || target.closest('[data-terminal-close]')) this.close();
			else if (run) this.typeAndRun(run.dataset.run!);
			else if (target.closest('[data-term-screen]') && !getSelection()?.toString()) this.focus();
		});

		this.dialog.querySelector('[data-term-form]')!.addEventListener('submit', (event) => {
			event.preventDefault();
			if (!this.busy) this.run(this.input.value);
		});

		this.input.addEventListener('keydown', (event) => this.onKey(event));
	}

	get isOpen() {
		return this.dialog.open && !('closing' in this.dialog.dataset);
	}

	open() {
		if (this.isOpen) return this.focus();
		delete this.dialog.dataset.closing;
		this.syncPlace();
		this.dialog.showModal();
		if (!this.booted) this.boot();
		this.focus();
		this.scrollDown();
	}

	close(instant = false) {
		if (!this.isOpen) return;
		if (instant || reduceMotion()) {
			this.dialog.close();
			return;
		}
		this.dialog.dataset.closing = '';
		setTimeout(() => {
			this.dialog.close();
			delete this.dialog.dataset.closing;
		}, CLOSE_MS);
	}

	/** The prompt shows the current page as a path. Also called after each page change. */
	syncPlace() {
		const { path } = this.place();
		this.ps1.textContent = path;
		this.cwd.textContent = path;
	}

	toggle() {
		if (this.isOpen) this.close();
		else this.open();
	}

	/** Touch screens keep the keyboard down until the visitor taps the prompt. */
	private focus() {
		if (finePointer()) this.input.focus();
	}

	// Output

	private newBlock() {
		this.block = document.createElement('div');
		this.block.className = 'term-block';
		this.log.append(this.block);
		return this.block;
	}

	private renderPart(parent: HTMLElement, part: Part) {
		if (typeof part === 'string') {
			parent.append(part);
			return;
		}
		const el = document.createElement(part.run ? 'button' : 'span');
		if (part.run) {
			(el as HTMLButtonElement).type = 'button';
			el.dataset.run = part.run;
			el.classList.add('term-run');
		}
		if (part.tone) el.classList.add(...part.tone.split(' '));
		appendMarked(el, part.text, part.mark);
		parent.append(el);
	}

	private line(parts: Part | Part[], className?: string) {
		const block = this.block ?? this.newBlock();
		const p = document.createElement('p');
		if (className) p.className = className;
		p.style.setProperty('--i', String(block.childElementCount));
		for (const part of [parts].flat()) this.renderPart(p, part);
		block.append(p);
		return p;
	}

	private print(...parts: Part[]) {
		return this.line(parts);
	}

	/** Two columns, the first `width` characters wide. Stacks on phones. */
	private row(width: number, key: Part | Part[], ...rest: Part[]) {
		const p = this.line([], 'term-row');
		p.style.setProperty('--key', `${width}ch`);
		const left = document.createElement('span');
		const right = document.createElement('span');
		for (const part of [key].flat()) this.renderPart(left, part);
		for (const part of rest) this.renderPart(right, part);
		p.append(left, right);
		return p;
	}

	private gap() {
		this.line([], 'term-gap');
	}

	private error(text: string) {
		this.print({ text, tone: 't-err' });
	}

	/** Fills `{name}` placeholders in a translated string with text or styled parts. */
	private fill(template: string, vars: Record<string, Part>): Part[] {
		return template
			.split(/(\{\w+\})/)
			.filter(Boolean)
			.map((chunk) => vars[chunk.slice(1, -1)] ?? chunk);
	}

	private scrollDown() {
		this.screen.scrollTop = this.screen.scrollHeight;
	}

	private clear() {
		this.log.replaceChildren();
		this.block = null;
	}

	private boot() {
		this.booted = true;
		this.newBlock();
		const stamp = new Intl.DateTimeFormat(this.data.lang, {
			weekday: 'short',
			day: 'numeric',
			month: 'short',
			hour: '2-digit',
			minute: '2-digit',
		}).format(new Date());
		this.print({ text: `mk shell 1.0 · tty/web · ${stamp}`, tone: 't-faint' });
		this.print(
			...this.fill(this.s.motd, {
				handle: { text: this.data.handle, tone: 't-tag' },
				help: { text: 'help', tone: 't-link', run: 'help' },
			}),
		);
	}

	// Input

	private onKey(event: KeyboardEvent) {
		if (this.busy) {
			event.preventDefault();
			return;
		}
		const ctrl = event.ctrlKey || event.metaKey;
		if (event.key === 'Tab') {
			event.preventDefault();
			this.complete();
		} else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
			event.preventDefault();
			this.recallHistory(event.key === 'ArrowUp' ? 1 : -1);
		} else if (ctrl && event.key.toLowerCase() === 'l') {
			event.preventDefault();
			this.clear();
		} else if (ctrl && event.key.toLowerCase() === 'c' && !getSelection()?.toString() && this.input.selectionStart === this.input.selectionEnd) {
			event.preventDefault();
			this.echo(`${this.input.value}^C`);
			this.input.value = '';
			this.recall = -1;
			this.scrollDown();
		}
	}

	private recallHistory(step: 1 | -1) {
		if (!this.history.length) return;
		if (this.recall === -1) this.draft = this.input.value;
		this.recall = Math.max(-1, Math.min(this.history.length - 1, this.recall + step));
		this.input.value = this.recall === -1 ? this.draft : this.history[this.history.length - 1 - this.recall];
		requestAnimationFrame(() => this.input.setSelectionRange(this.input.value.length, this.input.value.length));
	}

	private complete() {
		const value = this.input.value;
		const tokens = value.split(' ');
		const current = tokens[tokens.length - 1].toLowerCase();
		const candidates = tokens.length === 1 ? this.data.commands.map((c) => c.name) : this.argCandidates(tokens[0].toLowerCase());
		const matches = [...new Set(candidates)].filter((c) => c.toLowerCase().startsWith(current)).sort();
		if (!matches.length) return;
		if (matches.length === 1) {
			tokens[tokens.length - 1] = `${matches[0]} `;
		} else {
			const prefix = commonPrefix(matches);
			if (prefix.length > current.length) {
				tokens[tokens.length - 1] = prefix;
			} else {
				// Nothing more to add: show the options, like a double Tab would.
				this.echo(value);
				this.newBlock();
				this.print(...matches.flatMap((m, i) => [i ? '   ' : '', { text: m, tone: 't-link' }]));
				this.scrollDown();
			}
		}
		this.input.value = tokens.join(' ');
	}

	private argCandidates(command: string) {
		const slugs = this.data.posts.map((p) => p.slug);
		switch (command) {
			case 'ls':
				return ['writing', 'series', 'tags'];
			case 'cat':
				return slugs;
			case 'open':
				return [...slugs, 'github', 'linkedin', 'email'];
			case 'cd':
				return ['~', 'writing', '..', this.data.otherLang, ...slugs];
			case 'grep':
				return this.allTags().map(([tag]) => `#${tag}`);
			default:
				return [];
		}
	}

	/** Types `command` into the prompt, then runs it. */
	async typeAndRun(command: string) {
		if (this.busy) return;
		this.busy = true;
		this.dialog.dataset.busy = '';
		this.input.value = '';
		for (const char of command) {
			this.input.value += char;
			await sleep(26 + Math.random() * 34);
		}
		await sleep(140);
		this.busy = false;
		delete this.dialog.dataset.busy;
		await this.run(this.input.value);
		this.focus();
	}

	private echo(raw: string) {
		this.newBlock();
		this.line([{ text: this.ps1.textContent ?? '', tone: 'path' }, ` $ ${raw}`], 'term-cmd');
	}

	async run(raw: string) {
		this.echo(raw);
		this.input.value = '';
		this.recall = -1;
		const line = raw.trim();
		if (line) {
			if (this.history[this.history.length - 1] !== line) this.history.push(line);
			saveHistory(this.history);
			const [name, ...args] = tokenize(line);
			const command = this.commands[name.toLowerCase()];
			if (command) await command(args);
			else this.notFound(name);
		}
		this.scrollDown();
	}

	private notFound(name: string) {
		this.error(this.s.notFound.replace('{name}', name));
		const typed = name.toLowerCase();
		// Closest command, preferring one that starts with what was typed ("dat" is "date", not "cat").
		const guess = this.data.commands
			.map((c) => [c.name, distance(typed, c.name) - (c.name.startsWith(typed) ? 0.5 : 0)] as const)
			.sort((a, b) => a[1] - b[1])[0];
		if (guess && guess[1] <= 2) {
			this.print(...this.fill(this.s.didYouMean, { name: { text: guess[0], tone: 't-link', run: guess[0] } }));
		}
	}

	// Places and posts

	private place(): Place {
		const { handle, home } = this.data;
		const path = location.pathname;
		const bare = path.startsWith(home) ? `/${path.slice(home.length)}` : path;
		const root = `~/${handle}`;
		if (bare === '/') return { kind: 'home', path: root };
		if (/^\/blog\/?$/.test(bare)) return { kind: 'writing', path: `${root}/writing` };
		const article = bare.match(/^\/blog\/([^/]+)\/?$/);
		if (article) return { kind: 'article', slug: article[1], path: `${root}/writing/${article[1]}` };
		return { kind: 'other', path: `${root}${bare.replace(/\/$/, '')}` };
	}

	/** Finds a post by exact slug, then by a unique prefix or fragment. Prints why when it can't. */
	private findPost(command: string, name: string) {
		const query = name.toLowerCase().replace(/\/$/, '');
		const { posts } = this.data;
		const exact = posts.find((p) => p.slug === query);
		if (exact) return exact;
		for (const test of [(p: ShellPost) => p.slug.startsWith(query), (p: ShellPost) => p.slug.includes(query)]) {
			const found = posts.filter(test);
			if (found.length === 1) return found[0];
			if (found.length > 1) {
				this.error(this.s.ambiguous.replace('{cmd}', command).replace('{name}', name));
				for (const post of found) this.print('  ', { text: post.slug, tone: 't-link', run: `${command} ${post.slug}` });
				return;
			}
		}
		this.error(this.s.noPost.replace('{cmd}', command).replace('{name}', name));
	}

	private allTags() {
		const counts = new Map<string, number>();
		for (const post of this.data.posts) for (const tag of post.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
		return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
	}

	private count(n: number, one: string, many: string) {
		return n === 1 ? one : many.replace('{n}', String(n));
	}

	/** Prints where we're going, closes the window, then changes page. */
	private async go(url: string, label: string) {
		this.print({ text: '→ ', tone: 't-ok' }, { text: this.s.opening.replace('{target}', label), tone: 't-muted' });
		this.scrollDown();
		if (url.startsWith('mailto:')) {
			location.href = url;
			return;
		}
		if (/^https?:/.test(url)) {
			// A command typed out after a click may no longer count as a user gesture: if the popup is
			// blocked, leave in this tab instead. (With 'noopener', window.open always returns null.)
			const tab = window.open(url, '_blank');
			if (tab) tab.opener = null;
			else location.href = url;
			return;
		}
		await sleep(260);
		if (new URL(url, location.href).pathname === location.pathname) {
			this.close();
			return;
		}
		this.close();
		await sleep(CLOSE_MS);
		await navigate(url);
	}

	// Commands

	private help() {
		const width = Math.max(...this.data.commands.map((c) => c.name.length)) + 1;
		for (const { name, args, help } of this.data.commands) {
			this.row(
				width,
				{ text: name, tone: 't-link', run: name },
				{ text: help, tone: 't-muted' },
				args ? { text: `  ${args}`, tone: 't-faint' } : '',
			);
		}
	}

	private whoami() {
		const { name, tagline, handle } = this.data;
		this.print({ text: name, tone: 't-title' });
		this.print({ text: tagline, tone: 't-muted' });
		this.gap();
		this.print(
			{ text: `${handle} `, tone: 't-faint' },
			{ text: 'github', tone: 't-link', run: 'open github' },
			'  ',
			{ text: 'linkedin', tone: 't-link', run: 'open linkedin' },
			'  ',
			{ text: 'email', tone: 't-link', run: 'open email' },
		);
	}

	private ls(args: string[]) {
		const place = this.place();
		const target = (args.find((a) => !a.startsWith('-')) ?? (place.kind === 'home' || place.kind === 'other' ? '~' : 'writing')).replace(/\/$/, '');
		switch (target.toLowerCase()) {
			case '~':
			case '.':
			case '/':
				this.print(
					...['writing', 'series', 'tags'].flatMap((dir, i) => [i ? '   ' : '', { text: `${dir}/`, tone: 't-dir', run: `ls ${dir}` }]),
				);
				return;
			case 'writing':
			case 'blog':
			case 'posts':
				this.listPosts(place.kind === 'article' ? place.slug : undefined);
				return;
			case 'series':
				for (const series of this.data.series) {
					this.print({ text: series.title, tone: 't-text' });
					series.parts.forEach((slug, i) =>
						this.print({ text: `  ${i + 1}. `, tone: 't-faint' }, { text: slug, tone: 't-link', run: `cat ${slug}` }),
					);
				}
				return;
			case 'tags':
				this.tags();
				return;
			default: {
				const post = this.data.posts.find((p) => p.slug === target);
				if (post) this.print({ text: post.slug, tone: 't-link', run: `cat ${post.slug}` });
				else this.error(this.s.noLs.replace('{name}', target));
			}
		}
	}

	private listPosts(current?: string) {
		const { posts } = this.data;
		for (const post of posts) {
			this.row(
				11,
				{ text: post.date, tone: 't-faint' },
				{ text: post.slug, tone: 't-link', run: `cat ${post.slug}` },
				post.slug === current ? { text: `  ${this.s.here}`, tone: 't-here' } : '',
			);
		}
		this.print({ text: this.count(posts.length, this.s.post, this.s.posts), tone: 't-faint' });
	}

	private cat(args: string[]) {
		const place = this.place();
		const name = args[0] ?? (place.kind === 'article' ? place.slug : undefined);
		if (!name) {
			this.error(this.s.usage.replace('{usage}', 'cat <post>'));
			return;
		}
		const post = this.findPost('cat', name);
		if (!post) return;
		const series = this.data.series.find((s) => s.parts.includes(post.slug));
		const meta = [post.date, this.s.minutes.replace('{n}', String(post.minutes))];
		if (series) {
			const part = this.s.part.replace('{part}', String(series.parts.indexOf(post.slug) + 1)).replace('{total}', String(series.parts.length));
			meta.push(`${series.title}, ${part}`);
		}
		this.print({ text: post.title, tone: 't-title' });
		this.print({ text: meta.join(' · '), tone: 't-faint' });
		if (post.tags.length) this.print(...post.tags.flatMap((tag, i) => [i ? ' ' : '', { text: `#${tag}`, tone: 't-tag', run: `grep #${tag}` }]));
		this.gap();
		this.print({ text: post.description, tone: 't-text' });
		this.gap();
		this.print({ text: '→ ', tone: 't-ok' }, { text: this.s.openIt, tone: 't-link', run: `open ${post.slug}` });
	}

	private async openTarget(args: string[]) {
		const [name] = args;
		if (!name) {
			this.error(this.s.usage.replace('{usage}', 'open <post|github|linkedin|email>'));
			return;
		}
		const { links } = this.data;
		const external: Record<string, string> = { github: links.github, linkedin: links.linkedin, email: links.email, mail: links.email };
		const link = external[name.toLowerCase()];
		if (link) return this.go(link, name.toLowerCase());
		if (['writing', 'blog', '~'].includes(name)) return this.cd([name]);
		const post = this.findPost('open', name);
		if (post) await this.go(post.url, post.slug);
	}

	private async cd(args: string[]) {
		const name = (args[0] ?? '~').replace(/\/$/, '') || '/';
		const place = this.place();
		const lower = name.toLowerCase();
		if (['~', '/', `~/${this.data.handle}`, 'home'].includes(lower)) return this.go(this.data.home, '~');
		if (['writing', 'blog', 'posts', '~/writing'].includes(lower)) return this.go(this.data.writing, 'writing/');
		if (lower === '..') {
			if (place.kind === 'article') return this.go(this.data.writing, 'writing/');
			return this.go(this.data.home, '~');
		}
		if (lower === this.data.lang) {
			this.print({ text: this.s.sameLang.replace('{lang}', lower), tone: 't-muted' });
			return;
		}
		if (lower === this.data.otherLang) {
			// The page's own alternate link points at its translation (see BaseLayout).
			const alternate = document.querySelector<HTMLLinkElement>('link[rel="alternate"][data-lang-alternate]');
			const url = alternate ? new URL(alternate.href).pathname : this.data.home;
			return this.go(url, lower);
		}
		const post = this.data.posts.find((p) => p.slug === lower.replace(/^(\.\/|writing\/)/, ''));
		if (post) return this.go(post.url, post.slug);
		this.error(this.s.noDir.replace('{name}', name));
	}

	private grep(args: string[]) {
		const query = args.join(' ').trim().toLowerCase();
		if (!query) {
			this.error(this.s.usage.replace('{usage}', 'grep <text|#tag>'));
			return;
		}
		const tagOnly = query.startsWith('#') ? query.slice(1) : '';
		const found = this.data.posts.filter((post) =>
			tagOnly
				? post.tags.includes(tagOnly)
				: [post.slug, post.title, post.description, ...post.tags].some((field) => field.toLowerCase().includes(query)),
		);
		if (!found.length) {
			this.error(this.s.noMatch.replace('{q}', `"${args.join(' ')}"`));
			return;
		}
		const mark = tagOnly ? undefined : query;
		for (const post of found) {
			this.print({ text: post.slug, tone: 't-link', run: `cat ${post.slug}`, mark });
			this.print('  ', { text: post.title, tone: 't-text', mark });
			const tagLine = post.tags.filter((tag) => (tagOnly ? tag === tagOnly : tag.includes(query)));
			if (tagLine.length) this.print('  ', ...tagLine.flatMap((tag, i) => [i ? ' ' : '', { text: `#${tag}`, tone: 't-tag', mark: tagOnly || query }]));
		}
		this.print({ text: this.count(found.length, this.s.match, this.s.matches), tone: 't-faint' });
	}

	private tags() {
		const tags = this.allTags();
		this.print(
			...tags.flatMap(([tag, n], i) => [
				i ? '   ' : '',
				{ text: `#${tag}`, tone: 't-tag', run: `grep #${tag}` },
				{ text: ` ${n}`, tone: 't-faint' },
			]),
		);
	}

	private async now() {
		const { musicUrl } = this.data;
		if (!musicUrl) {
			this.print({ text: this.s.nowOff, tone: 't-muted' });
			return;
		}
		const pending = this.print({ text: `♪ ${this.s.nowLoading}`, tone: 't-faint' });
		try {
			const response = await fetch(musicUrl, { signal: AbortSignal.timeout(6000) });
			if (!response.ok) throw new Error(`HTTP ${response.status}`);
			const { track, live, playedAt } = (await response.json()) as { track: Track | null; live: boolean; playedAt: string | null };
			pending.remove();
			if (!track) {
				this.print({ text: this.s.nowNone, tone: 't-muted' });
				return;
			}
			this.print({ text: '♪ ', tone: 't-music' }, { text: track.title, tone: 't-text' });
			this.print({ text: `  ${[track.artist, track.album].filter(Boolean).join(' · ')}`, tone: 't-muted' });
			if (live) this.print('  ', { text: this.s.live, tone: 't-live t-ok' });
			else if (playedAt) this.print({ text: `  ${this.s.played.replace('{time}', relativeTime(playedAt))}`, tone: 't-faint' });
			if (this.place().kind !== 'home') {
				this.print({ text: '  → ', tone: 't-ok' }, { text: this.s.nowPlayer, tone: 't-link', run: 'cd ~' });
			}
		} catch {
			pending.remove();
			this.error(this.s.nowError);
		}
	}

	private date() {
		const options: Intl.DateTimeFormatOptions = {
			weekday: 'short',
			day: 'numeric',
			month: 'short',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit',
			timeZoneName: 'short',
		};
		const now = new Date();
		const format = (timeZone?: string) => new Intl.DateTimeFormat(this.data.lang, { ...options, timeZone }).format(now);
		this.row(10, { text: this.s.dateFrance, tone: 't-tag' }, { text: format(this.data.timeZone), tone: 't-text' });
		const visitor = Intl.DateTimeFormat().resolvedOptions().timeZone;
		if (visitor && visitor !== this.data.timeZone) {
			this.row(10, { text: this.s.dateYours, tone: 't-faint' }, { text: format(), tone: 't-muted' });
		}
	}

	private showHistory() {
		if (!this.history.length) {
			this.print({ text: this.s.emptyHistory, tone: 't-muted' });
			return;
		}
		const width = String(this.history.length).length + 2;
		this.history.forEach((entry, i) => this.row(width, { text: String(i + 1), tone: 't-faint' }, { text: entry, tone: 't-link', run: entry }));
	}
}

// One shell per language: switching language swaps in the other dialog (see Terminal.astro).
const shells = new WeakMap<HTMLDialogElement, Shell>();

function currentShell() {
	const dialog = document.querySelector<HTMLDialogElement>('dialog[data-terminal]');
	if (!dialog) return;
	let shell = shells.get(dialog);
	if (!shell) {
		shell = new Shell(dialog);
		shells.set(dialog, shell);
	}
	return shell;
}

function isTyping(target: EventTarget | null) {
	const el = target as HTMLElement | null;
	return !!el?.closest?.('input, textarea, select, [contenteditable=""], [contenteditable="true"]');
}

document.addEventListener('keydown', (event) => {
	const ctrl = event.ctrlKey || event.metaKey;
	if (ctrl && !event.altKey && !event.shiftKey && event.key.toLowerCase() === 'k') {
		event.preventDefault();
		currentShell()?.toggle();
	} else if (event.key === '`' && !ctrl && !event.altKey && !isTyping(event.target)) {
		event.preventDefault();
		currentShell()?.open();
	}
});

document.addEventListener('click', (event) => {
	const trigger = (event.target as Element).closest?.('[data-terminal-open]');
	if (!trigger) return;
	event.preventDefault();
	const shell = currentShell();
	shell?.open();
	const command = (trigger as HTMLElement).dataset.terminalOpen;
	if (command) shell?.typeAndRun(command);
});

// Any other navigation (back button, a link under the window) closes the shell first.
document.addEventListener('astro:before-preparation', () => currentShell()?.close(true));

document.addEventListener('astro:page-load', () => {
	currentShell()?.syncPlace();
	// Shortcut hints say ⌘ on Apple keyboards.
	if (!/Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)) return;
	document.querySelectorAll('[data-shortcut-mod]').forEach((el) => (el.textContent = '⌘'));
});
