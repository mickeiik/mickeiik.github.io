/**
 * Wide figures (src/components/blog/WideFigure.astro) reach across the article's side column.
 * The sticky side column treats them as walls: when one comes up from below, the column stops above it and scrolls
 * away with the page; once the figure has passed, the column follows its bottom edge back into its sticky place.
 */

const FIGURES = '[data-wide-figure]';
/** Space kept between the column and a figure. */
const MARGIN = 24;

let cleanup: (() => void) | undefined;

/**
 * An element's top in the viewport from layout alone. Bounding boxes include transforms, and the article card's
 * entrance animation scales and slides it for a moment after load: measuring that would place the column against
 * where the figure is drawn mid-animation, then jump when the animation ends.
 */
function layoutTop(element: HTMLElement) {
	let top = 0;
	for (let node: HTMLElement | null = element; node; node = node.offsetParent as HTMLElement | null) {
		// offsetTop starts inside the parent's border: add it back.
		top += node.offsetTop + ((node.offsetParent as HTMLElement | null)?.clientTop ?? 0);
	}
	return top - window.scrollY;
}

function init() {
	cleanup?.();
	cleanup = undefined;

	const aside = document.querySelector<HTMLElement>('[data-article-aside]');
	const figures = [...document.querySelectorAll<HTMLElement>(FIGURES)];
	if (!aside || figures.length === 0) return;

	let frame = 0;
	let shift = 0;
	let phase: 'free' | 'held' | 'pushed' = 'free';

	function update() {
		frame = 0;
		let next = 0;
		let nextPhase: typeof phase = 'free';
		// Stacked layout (phones, tablets): the column dissolves into the page flow, nothing to push.
		if (getComputedStyle(aside!).display !== 'contents') {
			// Where sticky positioning alone would put the column.
			const box = aside!.getBoundingClientRect();
			const top = box.top - shift;
			const bottom = box.bottom - shift;
			let lowest = -Infinity; // pushed down by figures that have passed above
			let highest = 0; // held up by figures still coming from below
			for (const figure of figures) {
				const figureTop = layoutTop(figure);
				const figureBottom = figureTop + figure.offsetHeight;
				if (figureTop > top) highest = Math.min(highest, figureTop - MARGIN - bottom);
				else lowest = Math.max(lowest, figureBottom + MARGIN - top);
			}
			next = Math.max(lowest, highest);
			// Never pushed past the end of the article (a figure can close it).
			if (next > 0) next = Math.min(next, Math.max(0, aside!.parentElement!.getBoundingClientRect().bottom - bottom));
			if (next < 0) nextPhase = 'held';
			else if (next > 0) nextPhase = 'pushed';
		}
		// Crossing a figure shorter than the screen moves the column from above it to below it (or back):
		// fade it in at its new place instead of letting it jump.
		if ((phase === 'held' && nextPhase === 'pushed') || (phase === 'pushed' && nextPhase === 'held')) {
			aside!.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 250, easing: 'ease-out' });
		}
		phase = nextPhase;
		if (next !== shift) {
			shift = next;
			aside!.style.transform = shift ? `translateY(${shift}px)` : '';
		}
	}

	function schedule() {
		if (!frame) frame = requestAnimationFrame(update);
	}

	// Positions also change without scrolling: a figure's image loading (on a reload in the middle of the page,
	// the column is placed before the figure has its height).
	const resized = new ResizeObserver(schedule);
	[aside, ...figures].forEach((element) => resized.observe(element));

	window.addEventListener('scroll', schedule, { passive: true });
	window.addEventListener('resize', schedule);
	// Web fonts reflow the text above a figure, which moves it without resizing it.
	document.fonts?.ready.then(schedule);
	update();

	cleanup = () => {
		resized.disconnect();
		window.removeEventListener('scroll', schedule);
		window.removeEventListener('resize', schedule);
		cancelAnimationFrame(frame);
		aside.style.transform = '';
	};
}

document.addEventListener('astro:page-load', init);
