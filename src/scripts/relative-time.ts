const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
	['year', 365 * 86_400_000],
	['month', 30 * 86_400_000],
	['week', 7 * 86_400_000],
	['day', 86_400_000],
	['hour', 3_600_000],
	['minute', 60_000],
];

/** "2 hours ago", "yesterday", "il y a 5 minutes"... in the page's language. */
export function relativeTime(iso: string) {
	const diff = Date.parse(iso) - Date.now();
	const format = new Intl.RelativeTimeFormat(document.documentElement.lang || 'en', { numeric: 'auto' });
	for (const [unit, ms] of UNITS) {
		if (Math.abs(diff) >= ms) return format.format(Math.trunc(diff / ms), unit);
	}
	return format.format(Math.trunc(diff / 1000), 'second');
}
