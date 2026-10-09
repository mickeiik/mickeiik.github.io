/**
 * Behavior of the persistent site header:
 * - slides the active pill to the current page after each navigation,
 * - points the language switch at this page's translation.
 */

const header = () => document.querySelector<HTMLElement>('[data-site-header]');

function syncNav() {
	const root = header();
	if (!root) return;
	const active = document.documentElement.dataset.nav ?? '';

	// The header is reused across pages, so point the language switch at this page's translation.
	const alternate = document.querySelector<HTMLLinkElement>('link[rel="alternate"][data-lang-alternate]');
	// The <link> is absolute (production origin) for search engines; keep only its path so the switch stays on this site.
	if (alternate) {
		const { pathname, search, hash } = new URL(alternate.href);
		root.querySelectorAll<HTMLAnchorElement>('[data-lang-switch]').forEach((link) => link.setAttribute('href', pathname + search + hash));
	}

	root.querySelectorAll<HTMLAnchorElement>('[data-nav]').forEach((link) => {
		if (link.dataset.nav === active) link.setAttribute('aria-current', 'page');
		else link.removeAttribute('aria-current');
	});

	const pill = root.querySelector<HTMLElement>('[data-nav-pill]');
	const target = root.querySelector<HTMLElement>(`.site-nav [data-nav="${active}"]`);
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

// Registered once: they act on whichever header is current.
window.addEventListener('resize', syncNav);
document.fonts?.ready.then(syncNav);

document.addEventListener('astro:page-load', () => {
	syncNav();
});
