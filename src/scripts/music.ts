/**
 * The homepage music player card. It always starts stopped: nothing plays until the visitor presses play.
 *
 * Playback only happens through a real audio source (`data-audio-src` on the card). Without one,
 * the controls are disabled and the card stays stopped.
 *
 * The state lives in this module, so playback continues across client-side navigations
 * and a full reload starts stopped again.
 *
 * The seek bar is a range input: click or drag to jump, arrow keys to step, and hovering
 * shows the time under the pointer.
 */

const state = {
	playing: false,
	audio: null as HTMLAudioElement | null,
	/** Track length from the data, used until the audio has loaded its own duration. */
	duration: 0,
	/** The visitor is dragging a seek bar: don't move it under their finger. */
	seeking: false,
};

let frame = 0;

const formatTime = (ms: number) => `${Math.floor(ms / 60_000)}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')}`;

function duration() {
	return state.audio && Number.isFinite(state.audio.duration) ? state.audio.duration * 1000 : state.duration;
}

const currentPosition = () => (state.audio ? state.audio.currentTime * 1000 : 0);

function loop() {
	render();
	if (state.playing) frame = requestAnimationFrame(loop);
}

function stop(reset = false) {
	if (!state.audio) return;
	state.audio.pause();
	if (reset) state.audio.currentTime = 0;
	state.playing = false;
	cancelAnimationFrame(frame);
	render();
}

function play() {
	const audio = state.audio;
	if (!audio) return;
	if (duration() && currentPosition() >= duration()) audio.currentTime = 0;
	state.playing = true;
	audio.play().catch(() => stop());
	cancelAnimationFrame(frame);
	frame = requestAnimationFrame(loop);
	render();
}

function seek(ms: number) {
	if (!state.audio) return;
	state.audio.currentTime = Math.max(0, Math.min(ms, duration())) / 1000;
	render();
}

/** Avoids rewriting unchanged attributes every frame (screen readers re-announce them). */
function setAttr(el: Element, name: string, value: string) {
	if (el.getAttribute(name) !== value) el.setAttribute(name, value);
}

function render() {
	const total = duration();
	const position = Math.min(currentPosition(), total || Infinity);
	const playing = state.playing ? 'playing' : 'stopped';

	document.querySelectorAll<HTMLElement>('[data-now-playing]').forEach((el) => {
		if (el.dataset.state !== playing) el.dataset.state = playing;
	});
	document.querySelectorAll<HTMLElement>('[data-player-status]').forEach((el) => {
		const label = (state.playing ? el.dataset.labelPlaying : el.dataset.labelStopped) ?? '';
		if (el.textContent !== label) el.textContent = label;
	});
	document.querySelectorAll<HTMLElement>('[data-player-toggle-playback]').forEach((button) => {
		setAttr(button, 'aria-pressed', String(state.playing));
		setAttr(button, 'aria-label', (state.playing ? button.dataset.labelPause : button.dataset.labelPlay) ?? '');
	});
	document.querySelectorAll<HTMLInputElement>('[data-player-seek]').forEach((input) => {
		if (total && input.max !== String(total)) input.max = String(total);
		// Leave the bar being dragged under the visitor's finger, focused or not (touch).
		if (!(state.seeking && input.closest('.is-seeking'))) input.value = String(position);
		input.style.setProperty('--progress', total ? `${(Number(input.value) / total) * 100}%` : '0%');
		setAttr(input, 'aria-valuetext', `${formatTime(Number(input.value))} / ${formatTime(total)}`);
	});
}

/** Moves the hover tip to the pointer and shows the time at that spot. */
function showTip(wrap: HTMLElement, clientX: number) {
	const input = wrap.querySelector<HTMLInputElement>('[data-player-seek]');
	const tip = wrap.querySelector<HTMLElement>('[data-player-seek-tip]');
	if (!input || !tip || input.disabled) return;
	const rect = input.getBoundingClientRect();
	const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
	tip.textContent = formatTime(ratio * Number(input.max));
	// Keep the tip inside the bar so it never gets clipped by the card.
	const half = tip.offsetWidth / 2;
	wrap.style.setProperty('--tip-x', `${Math.max(half, Math.min(rect.width - half, ratio * rect.width))}px`);
}

function setup() {
	const source = document.querySelector<HTMLElement>('[data-now-playing]');
	if (!source) return;
	if (!state.duration) state.duration = Number(source.dataset.duration) || 0;
	if (!state.audio && source.dataset.audioSrc) {
		state.audio = new Audio(source.dataset.audioSrc);
		state.audio.preload = 'metadata';
		state.audio.addEventListener('ended', () => stop(true));
		state.audio.addEventListener('loadedmetadata', render);
	}
	render();
}

document.addEventListener('click', (event) => {
	const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-player-toggle-playback]');
	if (!button || button.disabled) return;
	if (state.playing) stop();
	else play();
});

document.addEventListener('input', (event) => {
	const input = (event.target as HTMLElement).closest<HTMLInputElement>('[data-player-seek]');
	if (input) seek(Number(input.value));
});

document.addEventListener('pointerdown', (event) => {
	const wrap = (event.target as HTMLElement).closest<HTMLElement>('[data-player-seek-wrap]');
	if (!wrap || wrap.querySelector<HTMLInputElement>('[data-player-seek]')?.disabled) return;
	state.seeking = true;
	wrap.classList.add('is-seeking');
	showTip(wrap, event.clientX);
});

document.addEventListener('pointermove', (event) => {
	const wrap =
		(event.target as HTMLElement).closest<HTMLElement>('[data-player-seek-wrap]') ??
		(state.seeking ? document.querySelector<HTMLElement>('[data-player-seek-wrap].is-seeking') : null);
	if (wrap) showTip(wrap, event.clientX);
});

document.addEventListener('pointerup', () => {
	if (!state.seeking) return;
	state.seeking = false;
	document.querySelectorAll('[data-player-seek-wrap].is-seeking').forEach((wrap) => wrap.classList.remove('is-seeking'));
	render();
});

document.addEventListener('astro:page-load', setup);
