/**
 * Keeps the homepage music card in sync with the phone through the live Worker
 * (`data-live-src` on the card, see src/lib/live.ts).
 *
 * It refreshes on load, then every 30 s while the tab is visible, and rewrites only what changed.
 * It also writes the presence line ("listening now" / "played 2 hours ago"), because a relative
 * time rendered at build would be stale. Fetch errors are silent: the card keeps its last data.
 */
import type { Track } from '../lib/live';
import { markClippedLines, setAttr, setTrackDuration } from './music';
import { relativeTime } from './relative-time';

const POLL_MS = 30_000;

interface Snapshot {
	track: Track | null;
	live: boolean;
	playedAt: string | null;
}

let timer = 0;

const card = () => document.querySelector<HTMLElement>('[data-now-playing][data-live-src]');

function setText(el: Element | null | undefined, value: string) {
	if (el && el.textContent !== value) el.textContent = value;
}

function renderPresence(root: HTMLElement) {
	const presence = root.querySelector<HTMLElement>('[data-music-presence]');
	if (!presence) return;
	const { live, playedAt, labelLive = '', labelPlayed = '' } = presence.dataset;
	const label = live ? labelLive : playedAt ? labelPlayed.replace('{time}', relativeTime(playedAt)) : '';
	setText(presence.querySelector('[data-presence-text]'), label);
	presence.dataset.ready = '';
}

/** Shows the cover as the record's sleeve, or the record alone when there is none. */
function renderArtwork(record: HTMLElement | null, url: string | undefined) {
	if (!record) return;
	const sleeve = record.querySelector('.sleeve');
	if (url) {
		if (sleeve?.getAttribute('src') === url) return;
		const next = document.createElement('img');
		next.className = 'sleeve';
		next.src = url;
		next.alt = '';
		if (sleeve) sleeve.replaceWith(next);
		else record.append(next);
		record.dataset.cover = '';
	} else if (sleeve) {
		sleeve.remove();
		delete record.dataset.cover;
	}
}

// When the card gets a real audio source, don't swap the track while the visitor is listening to it.
function apply(root: HTMLElement, { track, live, playedAt }: Snapshot) {
	if (!track) return;
	const title = root.querySelector('[data-track-title]');
	const changed = title?.textContent !== track.title;
	setText(title, track.title);
	setText(root.querySelector('[data-track-meta]'), [track.artist, track.album].filter(Boolean).join(' · '));
	markClippedLines(root);
	renderArtwork(root.querySelector<HTMLElement>('[data-track-art]'), track.artworkUrl);
	setAttr(root, 'data-duration', String(track.durationMs ?? ''));
	if (changed) {
		setTrackDuration(track.durationMs ?? 0);
		if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
			root.querySelector('.info')?.animate(
				[
					{ opacity: 0, transform: 'translateY(6px)' },
					{ opacity: 1, transform: 'none' },
				],
				{ duration: 450, easing: 'cubic-bezier(0.2, 0.75, 0.2, 1)' },
			);
		}
	}

	const presence = root.querySelector<HTMLElement>('[data-music-presence]');
	if (presence) {
		if (live) setAttr(presence, 'data-live', 'true');
		else presence.removeAttribute('data-live');
		if (playedAt) setAttr(presence, 'data-played-at', playedAt);
	}
}

async function refresh() {
	const root = card();
	if (!root?.dataset.liveSrc) return;
	try {
		const response = await fetch(root.dataset.liveSrc);
		if (response.ok) apply(root, await response.json());
	} catch {
		// Offline or the Worker is down: keep what the card shows.
	}
	renderPresence(root);
}

function schedule() {
	clearInterval(timer);
	timer = 0;
	if (card() && document.visibilityState === 'visible') timer = window.setInterval(refresh, POLL_MS);
}

document.addEventListener('astro:page-load', () => {
	const root = card();
	if (root) {
		renderPresence(root);
		refresh();
	}
	schedule();
});

document.addEventListener('visibilitychange', () => {
	if (document.visibilityState === 'visible') refresh();
	schedule();
});

document.addEventListener('astro:before-swap', () => {
	clearInterval(timer);
	timer = 0;
});
