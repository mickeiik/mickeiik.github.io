import { LIVE_API_URL } from 'astro:env/client';

/**
 * Live homepage data from the Cloudflare Worker (~/Work/mickeiik-live, `LIVE_API_URL`).
 * The build renders a snapshot, then the browser keeps it fresh (src/scripts/music-live.ts).
 * Without a Worker URL, `astro dev` shows sample values and production builds hide the tile.
 * Reading still returns sample values until liseur-sync is connected.
 * GitHub activity is fetched at build time instead (src/lib/github.ts).
 */

/** Track metadata, owned by the Worker. Playback state lives in the browser (src/scripts/music.ts). */
export interface Track {
	title: string;
	artist: string;
	album?: string;
	/** Cover image, shown on the record's label. */
	artworkUrl?: string;
	/** Track length, drives the progress bar and the time readout. */
	durationMs?: number;
	/** Audio source. Without it the player controls stay disabled. */
	audioUrl?: string;
	/** A track is playing on the phone right now. */
	live?: boolean;
	/** When the track started on the phone, ISO 8601. */
	playedAt?: string;
}

export interface Book {
	title: string;
	author: string;
}

const sample = import.meta.env.DEV;

/** The Worker's music endpoint, polled by the card in the browser too. */
export const musicUrl = LIVE_API_URL ? new URL('/music', LIVE_API_URL).href : undefined;

async function loadTrack(): Promise<Track | null> {
	if (!musicUrl) {
		if (sample) return { title: '[Track title]', artist: '[Artist]', album: '[Album]', durationMs: 210_000 };
		console.warn('[live] LIVE_API_URL is not set, the music tile is hidden.');
		return null;
	}
	try {
		const response = await fetch(musicUrl, { signal: AbortSignal.timeout(5000) });
		if (!response.ok) throw new Error(`HTTP ${response.status}`);
		const { track, live, playedAt } = (await response.json()) as { track: Track | null; live: boolean; playedAt: string | null };
		if (!track) console.warn('[live] No track played yet, the music tile is hidden.');
		return track && { ...track, live, playedAt: playedAt ?? undefined };
	} catch (error) {
		console.warn(`[live] Could not load the current track, the music tile is hidden: ${(error as Error).message}`);
		return null;
	}
}

// One request per build, shared by every locale's homepage. Dev fetches on every render.
let pending: Promise<Track | null> | undefined;

export function getTrack() {
	if (import.meta.env.DEV) return loadTrack();
	pending ??= loadTrack();
	return pending;
}

export function getReading(): Book | null {
	return sample ? { title: '[Book title]', author: '[Author]' } : null;
}
