// confettiText/src/core/adjust.ts — framework-agnostic confetti-of-letters burst engine.
// Every particle is a real DOM <span> holding one letter of the source text. Kinematics are ported
// from canvas-confetti (velocity + per-frame decay, constant gravity/drift, wobble, and a
// scaleY(cos(tilt)) paper-flip tumble) so the burst feels familiar; the letters, colours, and
// variable-font weight jitter are the typographic layer on top.
import { CONFETTI_TEXT_CLASSES, DEFAULT_COLORS, type ConfettiTextOptions } from './types'

/** Base particle font-size in px before `scalar` and per-particle jitter. */
const BASE_SIZE = 18
/** Gravity is applied at 2× internally — tuned so the default 1.1 falls right for letter-scale pieces. */
const GRAVITY_SCALE = 2
/** Ceiling on a single burst's particle count — a stray huge value can't freeze the tab. */
const MAX_PARTICLE_COUNT = 1000
/** Ceiling on particle lifetime in frames. */
const MAX_TICKS = 1200
/** Ceiling on simultaneously-live particles across all bursts — caps rapid-fire spam. */
const MAX_LIVE_PIECES = 3000

/** Clamp `n` into [lo, hi]; a non-finite input (NaN/Infinity) resolves to `lo`. */
function clamp(n: number, lo: number, hi: number): number {
	if (!Number.isFinite(n)) return lo
	return n < lo ? lo : n > hi ? hi : n
}

/** Fully-resolved options with every default filled in. */
interface Resolved {
	particleCount: number
	angle: number
	spread: number
	startVelocity: number
	decay: number
	gravity: number
	drift: number
	ticks: number
	scalar: number
	colors: readonly string[] | null
	weightRange: [number, number] | null
	fontFamily: string | null
	flat: boolean
	zIndex: number
	disableForReducedMotion: boolean
}

/** One live letter-particle. */
interface Piece {
	el: HTMLSpanElement
	x: number
	y: number
	/** Precomputed unit launch direction (cos/sin of the launch angle) — invariant after launch. */
	dirX: number
	dirY: number
	velocity: number
	wobble: number
	wobbleSpeed: number
	tilt: number
	tiltSpeed: number
	/** Rotation-per-tilt multiplier, for spin variety. */
	spin: number
	tick: number
	totalTicks: number
	gravity: number
	drift: number
	decay: number
	flat: boolean
}

// ─── Shared layer + animation loop (one per document) ─────────────────────────

/** The single fixed layer that holds all live pieces; created lazily, reused across bursts. */
let _layer: HTMLDivElement | null = null
/** All live particles across every in-flight burst. */
let _pieces: Piece[] = []
/** Handle for the running rAF loop, or 0 when idle. */
let _raf = 0

/** True when the user has asked the OS to reduce motion. */
function prefersReducedMotion(): boolean {
	return (
		typeof window !== 'undefined' &&
		typeof window.matchMedia === 'function' &&
		window.matchMedia('(prefers-reduced-motion: reduce)').matches
	)
}

/** Resolve user options against the defaults. */
function resolve(options: ConfettiTextOptions): Resolved {
	const rawColors = options.colors
	return {
		particleCount: clamp(Math.floor(options.particleCount ?? 70), 0, MAX_PARTICLE_COUNT),
		angle: options.angle ?? 90,
		spread: options.spread ?? 62,
		startVelocity: options.startVelocity ?? 34,
		decay: options.decay ?? 0.9,
		gravity: options.gravity ?? 1.1,
		drift: options.drift ?? 0,
		ticks: clamp(Math.floor(options.ticks ?? 200), 1, MAX_TICKS),
		scalar: options.scalar ?? 1,
		// undefined → festive default; null/empty → uncoloured (inherit currentColor)
		colors: rawColors === undefined ? DEFAULT_COLORS : rawColors && rawColors.length ? rawColors : null,
		weightRange: options.weightRange === undefined ? [400, 700] : options.weightRange,
		fontFamily: options.fontFamily ?? null,
		flat: options.flat ?? false,
		zIndex: options.zIndex ?? 9999,
		disableForReducedMotion: options.disableForReducedMotion ?? true,
	}
}

/** Ensure the fixed confetti layer exists and is attached; return it. */
function ensureLayer(zIndex: number): HTMLDivElement {
	if (_layer && _layer.isConnected) {
		_layer.style.zIndex = String(zIndex)
		return _layer
	}
	const layer = document.createElement('div')
	layer.className = CONFETTI_TEXT_CLASSES.layer
	layer.setAttribute('aria-hidden', 'true')
	Object.assign(layer.style, {
		position: 'fixed',
		top: '0',
		left: '0',
		width: '100%',
		height: '100%',
		pointerEvents: 'none',
		overflow: 'hidden',
		zIndex: String(zIndex),
	})
	document.body.appendChild(layer)
	_layer = layer
	return layer
}

/** Split source text into its non-whitespace letters; fall back to a sparkle if empty. */
function toLetters(text: string): string[] {
	const stripped = text.replace(/\s+/g, '')
	return stripped.length ? Array.from(stripped) : ['✦']
}

/** Emit a burst of letter-particles from an absolute viewport point (px). */
function fireAt(originX: number, originY: number, letters: string[], o: Resolved): void {
	const layer = ensureLayer(o.zIndex)
	const radAngle = (o.angle * Math.PI) / 180
	const radSpread = (o.spread * Math.PI) / 180
	// Respect the global live-particle cap so rapid repeated bursts can't stack unbounded work.
	const count = Math.min(o.particleCount, Math.max(0, MAX_LIVE_PIECES - _pieces.length))
	const frag = document.createDocumentFragment()

	for (let i = 0; i < count; i++) {
		const el = document.createElement('span')
		el.className = CONFETTI_TEXT_CLASSES.piece
		el.textContent = letters[i % letters.length]
		const size = BASE_SIZE * o.scalar * (0.75 + Math.random() * 0.6)
		el.style.position = 'absolute'
		el.style.top = '0'
		el.style.left = '0'
		el.style.fontSize = `${size.toFixed(1)}px`
		el.style.lineHeight = '1'
		el.style.userSelect = 'none'
		if (o.fontFamily) el.style.fontFamily = o.fontFamily
		if (o.colors) el.style.color = o.colors[(Math.random() * o.colors.length) | 0]
		if (o.weightRange) {
			const [wa, wb] = o.weightRange
			const w = Math.round(wa + Math.random() * (wb - wa))
			el.style.fontVariationSettings = `"wght" ${w}`
			el.style.fontWeight = String(w) // fallback for non-variable fonts
		}
		frag.appendChild(el)

		// -radAngle so 90° points up (screen +y is down); jitter within the spread cone.
		const a2d = -radAngle + (0.5 * radSpread - Math.random() * radSpread)
		_pieces.push({
			el,
			x: originX,
			y: originY,
			dirX: Math.cos(a2d),
			dirY: Math.sin(a2d),
			velocity: o.startVelocity * (0.5 + Math.random()),
			wobble: Math.random() * 10,
			wobbleSpeed: 0.05 + Math.random() * 0.06,
			tilt: Math.random() * Math.PI,
			tiltSpeed: (Math.random() < 0.5 ? -1 : 1) * (0.08 + Math.random() * 0.08),
			spin: (Math.random() - 0.5) * 22,
			tick: 0,
			totalTicks: o.ticks,
			gravity: o.gravity,
			drift: o.drift,
			decay: o.decay,
			flat: o.flat,
		})
	}
	layer.appendChild(frag)

	if (!_raf && typeof requestAnimationFrame === 'function') {
		_raf = requestAnimationFrame(step)
	}
}

/** Advance every live particle one frame; retire spent or off-screen ones. */
function step(): void {
	const viewportH = typeof window !== 'undefined' ? window.innerHeight : 0
	const viewportW = typeof window !== 'undefined' ? window.innerWidth : 0
	for (let i = _pieces.length - 1; i >= 0; i--) {
		const p = _pieces[i]
		p.x += p.dirX * p.velocity + p.drift
		p.y += p.dirY * p.velocity + p.gravity * GRAVITY_SCALE
		p.velocity *= p.decay
		p.wobble += p.wobbleSpeed
		p.tilt += p.tiltSpeed
		const wx = p.x + 8 * Math.cos(p.wobble)
		const wy = p.y + 8 * Math.sin(p.wobble)
		const progress = p.tick / p.totalTicks
		p.el.style.opacity = (1 - progress).toFixed(3)
		const scaleY = p.flat ? 1 : Math.cos(p.tilt)
		p.el.style.transform = `translate(${wx.toFixed(1)}px, ${wy.toFixed(1)}px) rotate(${(
			p.tilt * p.spin
		).toFixed(1)}deg) scaleY(${scaleY.toFixed(3)})`
		p.tick++
		// Retire when spent, fallen past the bottom, or drifted off either side. (Not the top — gravity
		// can still carry an upward-launched piece back into view.)
		if (p.tick >= p.totalTicks || wy > viewportH + 80 || wx < -120 || wx > viewportW + 120) {
			p.el.remove()
			_pieces.splice(i, 1)
		}
	}
	if (_pieces.length && typeof requestAnimationFrame === 'function') {
		_raf = requestAnimationFrame(step)
	} else {
		_raf = 0
		// No pieces left — don't leave an empty full-viewport layer attached to <body>.
		if (_layer) {
			_layer.remove()
			_layer = null
		}
	}
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Fire a one-shot confetti burst made of the letters of `options.text`. Origin is a viewport
 * fraction (default centre). Safe to call repeatedly — bursts share one layer and animation loop.
 * No-op during SSR or (by default) when the user prefers reduced motion.
 *
 * @example confettiText({ text: 'Hooray', particleCount: 120, spread: 90 })
 */
export function confettiText(options: ConfettiTextOptions = {}): void {
	if (typeof document === 'undefined' || !document.body) return
	const o = resolve(options)
	if (o.disableForReducedMotion && prefersReducedMotion()) return
	const originX = (options.origin?.x ?? 0.5) * window.innerWidth
	const originY = (options.origin?.y ?? 0.5) * window.innerHeight
	fireAt(originX, originY, toLetters(options.text ?? 'Yay'), o)
}

/**
 * Attach a click handler to `element` that bursts its own text from its on-screen position.
 * Returns a detach function. `options.text` overrides the element's text if provided.
 *
 * @example const detach = attachConfettiText(document.querySelector('h1')!)
 */
/** Tags that are focusable and fire `click` on Enter/Space natively — no keyboard shim needed. */
const NATIVE_INTERACTIVE = new Set(['BUTTON', 'A', 'INPUT', 'SELECT', 'TEXTAREA', 'SUMMARY'])

export function attachConfettiText(element: HTMLElement, options: ConfettiTextOptions = {}): () => void {
	if (typeof document === 'undefined') return () => {}

	const fire = (): void => {
		if (!document.body) return
		const o = resolve(options)
		if (o.disableForReducedMotion && prefersReducedMotion()) return
		// Inherit the element's own font so the burst matches the text it came from (unless overridden).
		if (!o.fontFamily && typeof getComputedStyle === 'function') {
			o.fontFamily = getComputedStyle(element).fontFamily || null
		}
		const rect = element.getBoundingClientRect()
		const letters = toLetters(options.text ?? element.textContent ?? 'Yay')
		fireAt(rect.left + rect.width / 2, rect.top + rect.height / 2, letters, o)
	}

	const onClick = (): void => fire()
	const onKey = (e: KeyboardEvent): void => {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault()
			fire()
		}
	}
	element.addEventListener('click', onClick)

	// Keyboard operability: if the element isn't natively interactive, make it focusable + Enter/Space-able.
	const shim = !NATIVE_INTERACTIVE.has(element.tagName)
	let addedTabIndex = false
	let addedRole = false
	if (shim) {
		element.addEventListener('keydown', onKey)
		if (!element.hasAttribute('tabindex')) {
			element.tabIndex = 0
			addedTabIndex = true
		}
		if (!element.hasAttribute('role')) {
			element.setAttribute('role', 'button')
			addedRole = true
		}
	}

	return () => {
		element.removeEventListener('click', onClick)
		if (shim) {
			element.removeEventListener('keydown', onKey)
			if (addedTabIndex) element.removeAttribute('tabindex')
			if (addedRole) element.removeAttribute('role')
		}
	}
}

/** Immediately remove every live particle, cancel the loop, and detach the layer. */
export function clearConfettiText(): void {
	if (_raf && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(_raf)
	_raf = 0
	for (const p of _pieces) p.el.remove()
	_pieces = []
	if (_layer) {
		_layer.remove()
		_layer = null
	}
}
