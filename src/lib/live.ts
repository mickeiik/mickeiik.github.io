/**
 * Shapes of the live homepage data. Today they return sample values in development;
 * later they will read from the Cloudflare Worker (music metadata, liseur-sync).
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
}

export interface Book {
	title: string;
	author: string;
}

const sample = import.meta.env.DEV;

export function getTrack(): Track | null {
	return sample ? { title: '[Track title]', artist: '[Artist]', album: '[Album]', durationMs: 210_000 } : null;
}

export function getReading(): Book | null {
	return sample ? { title: '[Book title]', author: '[Author]' } : null;
}
