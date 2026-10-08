/**
 * Behavior of the persistent site header:
 * - slides the active pill to the current page after each navigation,
 * - opens and closes the phone menu (closing instantly when a link is chosen),
 * - expands the phone mini player into its full card.
 */

const header = () => document.querySelector<HTMLElement>('[data-site-header]');

function syncNav() {
	const root = header();
	if (!root) return;
	const active = document.documentElement.dataset.nav ?? '';

	// The header is reused across pages, so point the language switch at this page's translation.
	const alternate = document.querySelector<HTMLLinkElement>('link[rel="alternate"][data-lang-alternate]');
	if (alternate) root.querySelectorAll<HTMLAnchorElement>('[data-lang-switch]').forEach((link) => (link.href = alternate.href));

	root.querySelectorAll<HTMLAnchorElement>('[data-nav]').forEach((link) => {
		if (link.dataset.nav === active) link.setAttribute('aria-current', 'page');
		else link.removeAttribute('aria-current');
	});

	const pill = root.querySelector<HTMLElement>('[data-nav-pill]');
	const target = root.querySelector<HTMLElement>(`.desktop-nav [data-nav="${active}"]`);
	if (!pill) return;
	if (target) {
		pill.style.width = `${target.offsetWidth}px`;
		pill.style.transform = `translateX(${target.offsetLeft}px)`;
		pill.style.opacity = '1';
	} else {
		pill.style.opacity = '0';
	}
	// Enable the slide only after the first placement so the initial render does not animate.
	requestAnimationFrame(() => pill.parentElement?.setAttribute('data-ready', ''));
}

function setMenu(open: boolean) {
	const root = header();
	const menu = root?.querySelector<HTMLElement>('[data-menu]');
	const toggle = root?.querySelector<HTMLButtonElement>('[data-menu-toggle]');
	if (!menu || !toggle) return;
	menu.hidden = !open;
	toggle.setAttribute('aria-expanded', String(open));
	toggle.setAttribute('aria-label', (open ? toggle.dataset.labelClose : toggle.dataset.labelOpen) ?? '');
}

function setPlayer(open: boolean) {
	const panel = document.querySelector<HTMLElement>('[data-player]');
	const toggle = header()?.querySelector<HTMLButtonElement>('[data-player-toggle]');
	if (!panel || !toggle) return;
	toggle.setAttribute('aria-expanded', String(open));
	toggle.setAttribute('aria-label', (open ? toggle.dataset.labelHide : toggle.dataset.labelShow) ?? '');
	if (open) {
		panel.hidden = false;
		panel.dataset.state = 'open';
		return;
	}
	panel.dataset.state = 'closing';
	window.setTimeout(() => {
		if (panel.dataset.state === 'closing') panel.hidden = true;
	}, 320);
}

function bind() {
	const root = header();
	if (!root || root.dataset.bound) return;
	root.dataset.bound = 'true';

	root.addEventListener('click', (event) => {
		const target = event.target as HTMLElement;
		if (target.closest('[data-menu-toggle]')) {
			setMenu(root.querySelector('[data-menu]')?.hasAttribute('hidden') ?? false);
		} else if (target.closest('[data-player-toggle]')) {
			setPlayer(root.querySelector('[data-player-toggle]')?.getAttribute('aria-expanded') !== 'true');
		} else if (target.closest('[data-menu] a')) {
			setMenu(false);
		}
	});
}

// Registered once: they act on whichever header is current.
document.addEventListener('keydown', (event) => {
	if (event.key === 'Escape') setMenu(false);
});
window.addEventListener('resize', syncNav);
document.fonts?.ready.then(syncNav);

document.addEventListener('astro:page-load', () => {
	bind();
	setMenu(false);
	syncNav();
});
