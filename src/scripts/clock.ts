/** Keeps every [data-clock] element showing the current time in its time zone. */

let timer: number | undefined;

function tick() {
	document.querySelectorAll<HTMLElement>('[data-clock]').forEach((clock) => {
		const [hours, minutes] = new Intl.DateTimeFormat('en-GB', {
			hour: '2-digit',
			minute: '2-digit',
			timeZone: clock.dataset.timeZone,
		})
			.format(new Date())
			.split(':');
		clock.querySelector('[data-hours]')!.textContent = hours;
		clock.querySelector('[data-minutes]')!.textContent = minutes;
	});
}

document.addEventListener('astro:page-load', () => {
	window.clearInterval(timer);
	if (!document.querySelector('[data-clock]')) return;
	tick();
	timer = window.setInterval(tick, 15_000);
});
