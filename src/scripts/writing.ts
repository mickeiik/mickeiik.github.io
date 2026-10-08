/**
 * Writing page filters: search, tag and series, mirrored in the URL (?q=, ?tag=, ?series=).
 *
 * Cards that stop matching fold away bottom to top while new matches unfold top to bottom,
 * at the same time, so a swap reads as one card replacing another.
 */

interface Filters {
	q: string;
	tag: string;
	series: string;
}

const LEAVE_STAGGER = 0.05;
const ENTER_STAGGER = 0.06;

function matches(card: HTMLElement, { q, tag, series }: Filters) {
	const tags = (card.dataset.tags ?? '').split(' ').filter(Boolean);
	const query = q.trim().toLowerCase().replace(/^#/, '');
	return (
		(tag === 'all' || tags.includes(tag)) &&
		(!series || card.dataset.series === series) &&
		(!query || (card.dataset.title ?? '').includes(query) || tags.some((t) => t.includes(query)))
	);
}

const isShown = (card: HTMLElement) => !card.hidden && !card.classList.contains('list-leave');

const LEAVE_DURATION = 380;

function leave(card: HTMLElement, delay: number) {
	card.classList.remove('list-enter');
	card.style.setProperty('--delay', `${delay}s`);
	card.classList.add('list-leave');
	// A timer rather than `animationend`, which never fires when animations are throttled or disabled.
	window.setTimeout(() => {
		if (!card.classList.contains('list-leave')) return;
		card.classList.remove('list-leave');
		card.hidden = true;
	}, LEAVE_DURATION + delay * 1000);
}

function enter(card: HTMLElement, delay: number) {
	card.classList.remove('list-leave', 'list-enter');
	card.hidden = false;
	card.style.setProperty('--delay', `${delay}s`);
	void card.offsetWidth; // restart the animation
	card.classList.add('list-enter');
}

function init() {
	const root = document.querySelector<HTMLElement>('[data-writing]');
	if (!root || root.dataset.bound) return;
	root.dataset.bound = 'true';

	const cards = [...root.querySelectorAll<HTMLElement>('[data-post-card]')];
	const groups = [...root.querySelectorAll<HTMLElement>('[data-year-group]')];
	const count = root.querySelector<HTMLElement>('[data-count]');
	const empty = root.querySelector<HTMLElement>('[data-empty]');
	const toolbarClear = root.querySelector<HTMLElement>('.toolbar [data-clear]');
	const input = document.querySelector<HTMLInputElement>('#writing-query');
	const params = new URLSearchParams(location.search);
	const state: Filters = { q: params.get('q') ?? '', tag: params.get('tag') ?? 'all', series: params.get('series') ?? '' };
	if (input) input.value = state.q;

	function syncControls() {
		root!.querySelectorAll<HTMLButtonElement>('.tag-filter [data-filter-tag]').forEach((chip) => {
			chip.setAttribute('aria-pressed', String(chip.dataset.filterTag === state.tag));
		});
		root!.querySelectorAll<HTMLButtonElement>('[data-filter-series]').forEach((toggle) => {
			const on = toggle.dataset.filterSeries === state.series;
			toggle.setAttribute('aria-pressed', String(on));
			const label = toggle.querySelector('[data-label]');
			if (label) label.textContent = (on ? toggle.dataset.labelOn : toggle.dataset.labelOff) ?? '';
		});
		if (toolbarClear) toolbarClear.hidden = state.tag === 'all' && !state.series && !state.q.trim();
	}

	function syncUrl() {
		const url = new URL(location.href);
		for (const [key, value] of Object.entries({ q: state.q.trim(), tag: state.tag === 'all' ? '' : state.tag, series: state.series })) {
			if (value) url.searchParams.set(key, value);
			else url.searchParams.delete(key);
		}
		history.replaceState(history.state, '', url);
	}

	function apply(animate: boolean) {
		const matching = cards.filter((card) => matches(card, state));
		const leaving = cards.filter((card) => isShown(card) && !matching.includes(card));
		const entering = matching.filter((card) => !isShown(card));

		if (animate) {
			leaving.reverse().forEach((card, i) => leave(card, i * LEAVE_STAGGER));
			entering.forEach((card, i) => enter(card, 0.04 + i * ENTER_STAGGER));
		} else {
			cards.forEach((card) => (card.hidden = !matching.includes(card)));
		}

		const leaveTime = LEAVE_DURATION + leaving.length * LEAVE_STAGGER * 1000;
		groups.forEach((group) => {
			const groupCards = [...group.querySelectorAll<HTMLElement>('[data-post-card]')];
			if (groupCards.some((card) => matching.includes(card))) group.hidden = false;
			else if (!animate) group.hidden = true;
			// Let the cards fold away first, then hide the year heading if nothing came back.
			else window.setTimeout(() => (group.hidden = groupCards.every((card) => card.hidden)), leaveTime);
		});
		if (count) {
			count.textContent = (root!.dataset.countTemplate ?? '')
				.replace('{n}', String(matching.length))
				.replace('{total}', String(cards.length));
		}
		if (empty) empty.hidden = matching.length > 0;
		syncControls();
		syncUrl();
	}

	root.addEventListener('click', (event) => {
		const target = event.target as HTMLElement;
		const tagButton = target.closest<HTMLElement>('[data-filter-tag]');
		const seriesButton = target.closest<HTMLElement>('[data-filter-series]');
		if (tagButton) {
			const tag = tagButton.dataset.filterTag!;
			// Clicking the active chip again goes back to "all".
			state.tag = tagButton.closest('.tag-filter') && state.tag === tag ? 'all' : tag;
		} else if (seriesButton) {
			const id = seriesButton.dataset.filterSeries!;
			state.series = state.series === id ? '' : id;
		} else if (target.closest('[data-clear]')) {
			Object.assign(state, { q: '', tag: 'all', series: '' });
			if (input) input.value = '';
		} else {
			return;
		}
		apply(true);
	});

	input?.addEventListener('input', () => {
		state.q = input.value;
		apply(true);
	});
	input?.form?.addEventListener('submit', (event) => event.preventDefault());

	apply(false);
}

document.addEventListener('astro:page-load', init);
