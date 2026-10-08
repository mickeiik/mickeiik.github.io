/**
 * Shiki transformer that frames Markdown code blocks with a title bar and a copy button,
 * and highlights selected lines.
 *
 * Fence meta supported:
 *   ```ts title="agents.config.ts" {5,7-9}
 */

/** @param {string | undefined} raw */
function parseMeta(raw = '') {
	const title = raw.match(/title=(["'])(.*?)\1/)?.[2];
	const ranges = raw.match(/\{([\d,\s-]+)\}/)?.[1];
	const lines = new Set();
	for (const part of ranges?.split(',') ?? []) {
		const [start, end] = part.trim().split('-').map(Number);
		if (!start) continue;
		for (let n = start; n <= (end || start); n++) lines.add(n);
	}
	return { title, lines };
}

/**
 * @param {string} tagName
 * @param {Record<string, unknown>} properties
 * @param {any[]} [children]
 */
const h = (tagName, properties, children = []) => ({ type: 'element', tagName, properties, children });
/** @param {string} value */
const t = (value) => ({ type: 'text', value });

const icon = (/** @type {any[]} */ shapes, /** @type {string} */ className) =>
	h(
		'svg',
		{
			className: [className],
			viewBox: '0 0 24 24',
			width: 14,
			height: 14,
			fill: 'none',
			stroke: 'currentColor',
			strokeWidth: 2,
			strokeLinecap: 'round',
			strokeLinejoin: 'round',
			ariaHidden: 'true',
		},
		shapes,
	);

const copyIcon = () =>
	icon([h('rect', { x: 9, y: 9, width: 12, height: 12, rx: 2 }), h('path', { d: 'M5 15V5a2 2 0 0 1 2-2h10' })], 'code-icon-copy');
const checkIcon = () => icon([h('path', { d: 'M5 12l5 5 9-10' })], 'code-icon-check');

/** @returns {import('shiki').ShikiTransformer} */
export function codeFrame() {
	return {
		name: 'code-frame',
		line(node, line) {
			if (parseMeta(this.options.meta?.__raw).lines.has(line)) this.addClassToHast(node, 'highlighted');
		},
		root(root) {
			const pre = root.children.find((node) => node.type === 'element' && node.tagName === 'pre');
			// Inline code is rendered as <code>, not <pre>: leave it alone.
			if (!pre) return;
			const { title } = parseMeta(this.options.meta?.__raw);
			const lang = this.options.lang === 'plaintext' ? 'text' : this.options.lang;
			const label = title
				? [h('span', { className: ['code-file'] }, [t(title)]), h('span', { className: ['code-lang'] }, [t(lang)])]
				: [h('span', { className: ['code-lang'] }, [t(lang)])];
			const bar = h('div', { className: ['code-bar'] }, [
				h('span', { className: ['code-label'] }, label),
				h('button', { type: 'button', className: ['code-copy'], dataCopy: '' }, [
					copyIcon(),
					checkIcon(),
					h('span', { className: ['code-copy-label'] }, [t('copy')]),
				]),
			]);
			root.children = [h('figure', { className: ['code-frame'] }, [bar, pre])];
		},
	};
}
