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
	/** Launch direction in radians (screen space: +y is down). */
	angle2D: number
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
		particleCount: options.particleCount ?? 70,
		angle: options.angle ?? 90,
		spread: options.spread ?? 62,
		startVelocity: options.startVelocity ?? 34,
		decay: options.decay ?? 0.9,
		gravity: options.gravity ?? 1.1,
		drift: options.drift ?? 0,
		ticks: options.ticks ?? 200,
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

	for (let i = 0; i < o.particleCount; i++) {
		const el = document.createElement('span')
		el.className = CONFETTI_TEXT_CLASSES.piece
		el.textContent = letters[i % letters.length]
		const size = BASE_SIZE * o.scalar * (0.75 + Math.random() * 0.6)
		el.style.position = 'absolute'
		el.style.top = '0'
		el.style.left = '0'
		el.style.fontSize = `${size.toFixed(1)}px`
		el.style.lineHeight = '1'
		el.style.willChange = 'transform, opacity'
		el.style.userSelect = 'none'
		if (o.fontFamily) el.style.fontFamily = o.fontFamily
		if (o.colors) el.style.color = o.colors[(Math.random() * o.colors.length) | 0]
		if (o.weightRange) {
			const [wa, wb] = o.weightRange
			const w = Math.round(wa + Math.random() * (wb - wa))
			el.style.fontVariationSettings = `"wght" ${w}`
			el.style.fontWeight = String(w) // fallback for non-variable fonts
		}
		layer.appendChild(el)

		_pieces.push({
			el,
			x: originX,
			y: originY,
			// -radAngle so 90° points up (screen +y is down); jitter within the spread cone.
			angle2D: -radAngle + (0.5 * radSpread - Math.random() * radSpread),
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

	if (!_raf && typeof requestAnimationFrame === 'function') {
		_raf = requestAnimationFrame(step)
	}
}

/** Advance every live particle one frame; retire spent or off-screen ones. */
function step(): void {
	const viewportH = typeof window !== 'undefined' ? window.innerHeight : 0
	for (let i = _pieces.length - 1; i >= 0; i--) {
		const p = _pieces[i]
		p.x += Math.cos(p.angle2D) * p.velocity + p.drift
		p.y += Math.sin(p.angle2D) * p.velocity + p.gravity * GRAVITY_SCALE
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
		if (p.tick >= p.totalTicks || wy > viewportH + 80) {
			p.el.remove()
			_pieces.splice(i, 1)
		}
	}
	if (_pieces.length && typeof requestAnimationFrame === 'function') {
		_raf = requestAnimationFrame(step)
	} else {
		_raf = 0
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
	if (typeof document === 'undefined') return
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
export function attachConfettiText(element: HTMLElement, options: ConfettiTextOptions = {}): () => void {
	if (typeof document === 'undefined') return () => {}
	const handler = (): void => {
		const o = resolve(options)
		if (o.disableForReducedMotion && prefersReducedMotion()) return
		const rect = element.getBoundingClientRect()
		const letters = toLetters(options.text ?? element.textContent ?? 'Yay')
		fireAt(rect.left + rect.width / 2, rect.top + rect.height / 2, letters, o)
	}
	element.addEventListener('click', handler)
	return () => element.removeEventListener('click', handler)
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
