/**
 * Article table of contents:
 * - highlights the section being read and slides the marker to it,
 * - scrolls smoothly to a section on click and sweeps an underline under its heading,
 * - starts collapsed on phones.
 */

let cleanup: (() => void) | undefined;

function init() {
	cleanup?.();
	cleanup = undefined;

	const toc = document.querySelector<HTMLElement>('[data-toc]');
	if (!toc) return;

	const links = [...toc.querySelectorAll<HTMLAnchorElement>('[data-toc-link]')];
	const headings = links.map((link) => document.getElementById(link.dataset.tocLink!)).filter(Boolean) as HTMLElement[];
	const current = toc.querySelector<HTMLElement>('[data-toc-current]');
	const details = toc.querySelector('details');
	if (details && matchMedia('(max-width: 760px)').matches) details.open = false;

	let active = -1;
	function setActive(index: number) {
		if (index === active) return;
		active = index;
		links.forEach((link, i) => {
			if (i === index) link.setAttribute('aria-current', 'location');
			else link.removeAttribute('aria-current');
		});
		placeHighlight();
		if (current) current.textContent = `· ${String(index + 1).padStart(2, '0')}`;
	}

	// Links have no layout while the phone disclosure is closed, so measure again when it opens.
	function placeHighlight() {
		const link = links[active];
		if (link && (!details || details.open)) toc!.style.setProperty('--toc-y', `${link.offsetTop}px`);
	}

	function onScroll() {
		const offset = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-offset')) || 96;
		let index = 0;
		headings.forEach((heading, i) => {
			if (heading.getBoundingClientRect().top < offset + 100) index = i;
		});
		const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
		setActive(atBottom ? headings.length - 1 : index);
	}

	function onClick(event: Event) {
		const link = (event.target as HTMLElement).closest<HTMLAnchorElement>('[data-toc-link]');
		if (!link) return;
		const heading = document.getElementById(link.dataset.tocLink!);
		if (!heading) return;
		event.preventDefault();
		heading.scrollIntoView({ behavior: 'smooth', block: 'start' });
		history.replaceState(history.state, '', `#${heading.id}`);
		setActive(links.indexOf(link));
		heading.classList.remove('is-flashing');
		void heading.offsetWidth;
		heading.classList.add('is-flashing');
	}

	window.addEventListener('scroll', onScroll, { passive: true });
	window.addEventListener('resize', onScroll);
	toc.addEventListener('click', onClick);
	details?.addEventListener('toggle', placeHighlight);
	onScroll();

	cleanup = () => {
		window.removeEventListener('scroll', onScroll);
		window.removeEventListener('resize', onScroll);
		toc.removeEventListener('click', onClick);
		details?.removeEventListener('toggle', placeHighlight);
	};
}

document.addEventListener('astro:page-load', init);
