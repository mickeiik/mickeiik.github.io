/**
 * Copy buttons on framed code blocks. Labels come from the nearest [data-copy-text] element
 * so they follow the page language.
 */

function label(button: HTMLElement, copied: boolean) {
	const host = button.closest<HTMLElement>('[data-copy-text]');
	const text = copied ? host?.dataset.copiedText : host?.dataset.copyText;
	const target = button.querySelector('.code-copy-label');
	if (text && target) target.textContent = text;
	if (host?.dataset.copyLabel) button.setAttribute('aria-label', host.dataset.copyLabel);
}

document.addEventListener('astro:page-load', () => {
	document.querySelectorAll<HTMLElement>('[data-copy]').forEach((button) => label(button, false));
});

/** Clipboard API first, then the legacy selection copy for browsers that refuse it. */
async function copyText(text: string) {
	try {
		await navigator.clipboard.writeText(text);
		return true;
	} catch {
		const area = document.createElement('textarea');
		area.value = text;
		area.setAttribute('readonly', '');
		area.style.cssText = 'position: fixed; opacity: 0; pointer-events: none';
		document.body.append(area);
		area.select();
		const ok = document.execCommand('copy');
		area.remove();
		return ok;
	}
}

document.addEventListener('click', async (event) => {
	const button = (event.target as HTMLElement).closest<HTMLElement>('[data-copy]');
	if (!button) return;
	const code = button.closest('.code-frame')?.querySelector('pre code');
	if (!code || !(await copyText(code.textContent ?? ''))) return;
	button.classList.add('is-copied');
	label(button, true);
	window.setTimeout(() => {
		button.classList.remove('is-copied');
		label(button, false);
	}, 1600);
});
