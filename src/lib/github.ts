import { GITHUB_TOKEN } from 'astro:env/server';
import { site } from '../data/site';

/**
 * GitHub contribution calendar for the homepage tile, fetched once at build time.
 * The deploy workflow rebuilds the site daily so it stays fresh.
 *
 * Without a token, `astro dev` shows sample data and production builds hide the tile.
 * A failed request never breaks the build: it logs a warning and hides the tile.
 */

/** How many days the tile can show (the widest layout). */
export const ACTIVITY_DAYS = 90;

export interface ActivityDay {
	/** YYYY-MM-DD */
	date: string;
	count: number;
	/** GitHub's own quartile scale: 0 is none, 4 is the busiest days. */
	level: 0 | 1 | 2 | 3 | 4;
}

export interface Activity {
	/** Oldest first, ending today. */
	days: ActivityDay[];
}

const LEVELS = ['NONE', 'FIRST_QUARTILE', 'SECOND_QUARTILE', 'THIRD_QUARTILE', 'FOURTH_QUARTILE'];

const QUERY = `query($login: String!) {
	user(login: $login) {
		contributionsCollection {
			contributionCalendar {
				weeks { contributionDays { date contributionCount contributionLevel } }
			}
		}
	}
}`;

interface CalendarResponse {
	data?: {
		user?: {
			contributionsCollection: {
				contributionCalendar: {
					weeks: { contributionDays: { date: string; contributionCount: number; contributionLevel: string }[] }[];
				};
			};
		} | null;
	};
	errors?: { message: string }[];
}

async function fetchActivity(token: string): Promise<Activity> {
	const response = await fetch('https://api.github.com/graphql', {
		method: 'POST',
		headers: { Authorization: `bearer ${token}`, 'Content-Type': 'application/json' },
		body: JSON.stringify({ query: QUERY, variables: { login: site.githubUser } }),
	});
	if (!response.ok) throw new Error(`HTTP ${response.status}`);
	const json = (await response.json()) as CalendarResponse;
	const calendar = json.data?.user?.contributionsCollection.contributionCalendar;
	if (!calendar) throw new Error(json.errors?.map((e) => e.message).join('; ') || 'no calendar in the response');
	const days = calendar.weeks.flatMap((week) =>
		week.contributionDays.map((day) => ({
			date: day.date,
			count: day.contributionCount,
			level: Math.max(0, LEVELS.indexOf(day.contributionLevel)) as ActivityDay['level'],
		})),
	);
	return { days: days.slice(-ACTIVITY_DAYS) };
}

function sampleActivity(): Activity {
	const today = Date.now();
	const days = Array.from({ length: ACTIVITY_DAYS }, (_, i) => {
		const level = ((i * 11 + (i % 7) * 5) % 5) as ActivityDay['level'];
		const date = new Date(today - (ACTIVITY_DAYS - 1 - i) * 86_400_000).toISOString().slice(0, 10);
		return { date, count: level * 2, level };
	});
	return { days };
}

async function loadActivity(): Promise<Activity | null> {
	if (!GITHUB_TOKEN) {
		if (import.meta.env.DEV) return sampleActivity();
		console.warn('[github] GITHUB_TOKEN is not set, the GitHub tile is hidden.');
		return null;
	}
	try {
		return await fetchActivity(GITHUB_TOKEN);
	} catch (error) {
		console.warn(`[github] Could not load contributions, the GitHub tile is hidden: ${(error as Error).message}`);
		return null;
	}
}

// One request per build (or dev server run), shared by every locale's homepage.
let pending: Promise<Activity | null> | undefined;

export function getActivity() {
	pending ??= loadActivity();
	return pending;
}
