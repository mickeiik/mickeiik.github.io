/**
 * Diagrams that unfold as the reader scrolls (the caption strip is src/components/diagrams/ScrollCaptions.astro).
 * A reading line across the screen sweeps through the diagram: each stage it crosses becomes current, the ones
 * above it are done, the ones below it wait, dimmed. Scrolling back rewinds. Nothing to click.
 *
 * Markup, inside a `data-scrub` root:
 * - `data-scrub-step="n"`: stage n, in reading order. Its top edge is where the line triggers it.
 * - `data-scrub-follow="n"`: shown with stage n, without triggering anything (an escalation card, say).
 * - `data-scrub-link="n"`: an arrow leaving stage n, travelled once the next stage is reached.
 * - `data-scrub-caption="n"` and `data-scrub-tick="n"` (from ScrollCaptions): -1 before the first stage, one per
 *   stage, then the stage count once the last stage has scrolled past the line.
 *
 * Every element gets `data-scrub-state`: ahead, current or done (links: idle, fresh or travelled), and the root
 * `data-scrub-ready`. Without this script nothing is dimmed: the diagram reads as one static figure.
 */

const ROOTS = '[data-scrub]';
/** The reading line, as a share of the viewport height from its top. */
const LINE = 0.62;
/** Where a stage triggers, below its top edge. */
const OFFSET = 28;
/** Least scroll between two stages, so stages side by side in one row still come one at a time. */
const MIN_GAP = 64;

let cleanup: (() => void) | undefined;

interface Diagram {
	root: HTMLElement;
	steps: HTMLElement[];
	marked: [HTMLElement, number][];
	links: [HTMLElement, number][];
	at: number | undefined;
}

function indexed(root: HTMLElement, attribute: string) {
	return [...root.querySelectorAll<HTMLElement>(`[${attribute}]`)].map(
		(element) => [element, Number(element.getAttribute(attribute))] as [HTMLElement, number],
	);
}

function setup(root: HTMLElement): Diagram {
	const steps = indexed(root, 'data-scrub-step')
		.sort((a, b) => a[1] - b[1])
		.map(([element]) => element);
	const marked = [
		...indexed(root, 'data-scrub-step'),
		...indexed(root, 'data-scrub-follow'),
		...indexed(root, 'data-scrub-caption'),
		...indexed(root, 'data-scrub-tick'),
	];
	root.querySelectorAll<HTMLElement>('[data-scrub-bar]').forEach((bar) => (bar.hidden = false));
	root.dataset.scrubReady = '';
	return { root, steps, marked, links: indexed(root, 'data-scrub-link'), at: undefined };
}

/** The stage under the reading line: -1 above the first, the stage count once the last has passed. */
function position({ root, steps }: Diagram) {
	const line = window.innerHeight * LINE;
	const box = root.getBoundingClientRect();
	if (box.top > line) return -1;
	if (box.bottom < 0) return steps.length;
	let at = -1;
	let previous = -Infinity;
	for (const step of steps) {
		const trigger = Math.max(step.getBoundingClientRect().top + OFFSET, previous + MIN_GAP);
		if (trigger > line) break;
		previous = trigger;
		at++;
	}
	if (at === steps.length - 1 && steps[at].getBoundingClientRect().bottom < line) at = steps.length;
	return at;
}

function render(diagram: Diagram, at: number) {
	if (diagram.at === at) return;
	diagram.at = at;
	diagram.root.dataset.scrubAt = String(at);
	for (const [element, index] of diagram.marked) {
		element.dataset.scrubState = index < at ? 'done' : index === at ? 'current' : 'ahead';
	}
	for (const [element, index] of diagram.links) {
		element.dataset.scrubState = at <= index ? 'idle' : at === index + 1 ? 'fresh' : 'travelled';
	}
}

function init() {
	cleanup?.();
	cleanup = undefined;

	const diagrams = [...document.querySelectorAll<HTMLElement>(ROOTS)].map(setup);
	if (diagrams.length === 0) return;

	let frame = 0;

	function update() {
		frame = 0;
		for (const diagram of diagrams) render(diagram, position(diagram));
	}

	function schedule() {
		if (!frame) frame = requestAnimationFrame(update);
	}

	// Text wrapping (fonts, narrower screens) moves the stages without any scroll.
	const resized = new ResizeObserver(schedule);
	diagrams.forEach(({ root }) => resized.observe(root));
	window.addEventListener('scroll', schedule, { passive: true });
	window.addEventListener('resize', schedule);
	document.fonts?.ready.then(schedule);
	update();

	cleanup = () => {
		resized.disconnect();
		window.removeEventListener('scroll', schedule);
		window.removeEventListener('resize', schedule);
		cancelAnimationFrame(frame);
	};
}

document.addEventListener('astro:page-load', init);
