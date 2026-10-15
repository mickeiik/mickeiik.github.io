/** Keeps every [data-clock] element showing the current time in its time zone, formatted for its language. */

import { formatClock, type Lang } from '../i18n/utils';

let timer: number | undefined;

function tick() {
	document.querySelectorAll<HTMLElement>('[data-clock]').forEach((clock) => {
		const { hours, minutes, period } = formatClock(new Date(), clock.dataset.lang as Lang, clock.dataset.timeZone!);
		clock.querySelector('[data-hours]')!.textContent = hours;
		clock.querySelector('[data-minutes]')!.textContent = minutes;
		const periodEl = clock.querySelector('[data-period]');
		if (periodEl) periodEl.textContent = period;
	});
}

document.addEventListener('astro:page-load', () => {
	window.clearInterval(timer);
	if (!document.querySelector('[data-clock]')) return;
	tick();
	timer = window.setInterval(tick, 15_000);
});
