// confettiText/src/core/adjust.ts — framework-agnostic confetti burst engine.
// Every particle is a real DOM element: a <span> holding one letter/emoji of the source text, or a
// <div> geometric shape. Kinematics are ported from canvas-confetti (velocity + per-frame decay,
// constant gravity/drift, wobble, and a scaleY(cos(tilt)) paper-flip tumble) so the burst feels
// familiar; the letters, colours, and variable-font weight jitter are the typographic layer on top.
// Each burst owns its own fixed layer (so `zIndex` is per-burst) plus its own promise + `.clear()`.
import { CONFETTI_TEXT_CLASSES, DEFAULT_COLORS, type ConfettiTextOptions, type ConfettiShape } from './types'
import { makeKeyboardOperable } from './a11y'

/** Base particle size in px before `scalar` and per-particle jitter. */
const BASE_SIZE = 18
/** Gravity is applied at 2× internally — tuned so the default 1.1 falls right for letter-scale pieces. */
const GRAVITY_SCALE = 2
/** Ceiling on a single burst's particle count — a stray huge value can't freeze the tab. */
const MAX_PARTICLE_COUNT = 1000
/** Ceiling on particle lifetime in frames. */
const MAX_TICKS = 1200
/** Ceiling on simultaneously-live particles across all bursts — caps rapid-fire spam. */
const MAX_LIVE_PIECES = 3000
/** Max source-text length (chars) segmented per burst — bounds Intl.Segmenter work on huge input. */
const MAX_TEXT_LEN = 4000
/** Max distinct pool entries — particles cycle, so more than this is never needed. */
const MAX_POOL = 1000

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

/** One live particle (a letter/emoji span or a shape div). */
interface Piece {
	el: HTMLElement
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
	/** Which burst this piece belongs to, so bursts can resolve/clear independently. */
	burstId: number
}

/** How a finished burst ended: it ran to completion, or was cancelled via `clear()` / `clearConfettiText()`. */
export type ConfettiResult = 'completed' | 'cleared'

/**
 * A fired burst. It is a `Promise<ConfettiResult>` that resolves when the burst ends — to `'completed'`
 * if it ran its course, or `'cleared'` if it was cancelled — augmented with `clear()` to cancel just
 * this burst (other in-flight bursts keep running, unlike the global {@link clearConfettiText}).
 */
export type ConfettiBurst = Promise<ConfettiResult> & { clear: () => void }

// ─── Shared particle pool + one animation loop; per-burst layers ──────────────

/** All live particles across every in-flight burst (one shared rAF loop animates them). */
let _pieces: Piece[] = []
/** Handle for the running rAF loop, or 0 when idle. */
let _raf = 0

/** Per-burst live-count, result resolver, and its own fixed layer (so `zIndex` is independent). */
interface BurstRecord {
	live: number
	resolve: (result: ConfettiResult) => void
	layer: HTMLElement
}
const _bursts = new Map<number, BurstRecord>()
let _burstSeq = 0

/** Wrap a promise + clear fn into a ConfettiBurst. `.clear` lives only on this object — chaining
 *  (`.then()`/`.catch()`) returns a plain Promise without it; after the burst resolves, `.clear()` is
 *  a no-op. */
function makeBurst(promise: Promise<ConfettiResult>, clear: () => void): ConfettiBurst {
	return Object.assign(promise, { clear })
}

/** An already-finished burst — for no-op paths (SSR, reduced motion, zero particles, no rAF). */
function resolvedBurst(): ConfettiBurst {
	return makeBurst(Promise.resolve('completed'), () => {})
}

/** Cancel the shared rAF loop once no pieces remain. Per-burst layers are removed as each burst ends. */
function stopLoopIfIdle(): void {
	if (_pieces.length) return
	if (_raf && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(_raf)
	_raf = 0
}

/** Retire just one burst's pieces + layer and resolve it 'cleared', leaving other bursts running. */
function clearBurst(id: number): void {
	for (let i = _pieces.length - 1; i >= 0; i--) {
		if (_pieces[i].burstId === id) {
			_pieces[i].el.remove()
			_pieces.splice(i, 1)
		}
	}
	const b = _bursts.get(id)
	if (b) {
		b.layer.remove()
		b.resolve('cleared')
		_bursts.delete(id)
	}
	stopLoopIfIdle()
}

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

/** Create a fresh fixed, aria-hidden, non-interactive layer for one burst at its own `zIndex`. */
function createLayer(zIndex: number): HTMLElement {
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
	return layer
}

/** Lazily-created shared grapheme segmenter: `undefined` = not tried, `null` = unavailable. */
let _segmenter: { segment(s: string): Iterable<{ segment: string }> } | null | undefined
function getSegmenter(): { segment(s: string): Iterable<{ segment: string }> } | null {
	if (_segmenter === undefined) {
		_segmenter = typeof Intl.Segmenter === 'function' ? new Intl.Segmenter(undefined, { granularity: 'grapheme' }) : null
	}
	return _segmenter
}

/**
 * Split a string into grapheme clusters, so emoji/combining sequences stay whole. When
 * `Intl.Segmenter` is unavailable (legacy engines), falls back to code-point splitting — which keeps
 * astral scalars whole but splits multi-scalar clusters (ZWJ emoji, flags, skin-tone modifiers,
 * base+combining-mark). Segmenter ships in all evergreen browsers, so the fallback is rarely hit.
 */
function segmentGraphemes(s: string): string[] {
	if (!s) return []
	const seg = getSegmenter()
	return seg ? Array.from(seg.segment(s), (x) => x.segment) : Array.from(s)
}

/** A pool entry: a glyph (letter/emoji, `g`) or a geometric shape (`s`). */
type PoolItem = { g: string } | { s: ConfettiShape }

/**
 * Build the particle pool: shapes and `symbols` first (so they always appear even at a low
 * `particleCount`), then the grapheme-split, whitespace-stripped letters of `text`. Empty `symbols`
 * entries are dropped; the source text is length-capped before segmenting, and the pool is capped, to
 * bound work. Falls back to a single sparkle if empty.
 */
function toPool(text: string, symbols?: string[], shapes?: ConfettiShape[]): PoolItem[] {
	const letters: PoolItem[] = segmentGraphemes(text.replace(/\s+/g, '').slice(0, MAX_TEXT_LEN)).map((g) => ({ g }))
	const sym: PoolItem[] = (symbols ? symbols.filter(Boolean) : []).map((g) => ({ g }))
	const shp: PoolItem[] = (shapes ?? []).map((s) => ({ s }))
	let pool: PoolItem[] = [...shp, ...sym, ...letters]
	if (pool.length > MAX_POOL) pool = pool.slice(0, MAX_POOL)
	return pool.length ? pool : [{ g: '✦' }]
}

/** Emit a burst of particles from an absolute viewport point (px); return its ConfettiBurst. */
function fireAt(originX: number, originY: number, pool: PoolItem[], o: Resolved): ConfettiBurst {
	const burstId = ++_burstSeq
	let resolveFn: (result: ConfettiResult) => void = () => {}
	const promise = new Promise<ConfettiResult>((res) => {
		resolveFn = res
	})
	const burst = makeBurst(promise, () => clearBurst(burstId))

	// Respect the global live-particle cap so rapid repeated bursts can't stack unbounded work.
	const count = Math.min(o.particleCount, Math.max(0, MAX_LIVE_PIECES - _pieces.length))
	// Nothing to spawn (zero count / cap full), or no rAF to animate with → finish immediately.
	// Guarding here means we never attach an empty layer or leave a burst promise pending.
	if (count <= 0 || typeof requestAnimationFrame !== 'function') {
		resolveFn('completed')
		return burst
	}

	const layer = createLayer(o.zIndex)
	const radAngle = (o.angle * Math.PI) / 180
	const radSpread = (o.spread * Math.PI) / 180
	const frag = document.createDocumentFragment()

	for (let i = 0; i < count; i++) {
		const item = pool[i % pool.length]
		const size = BASE_SIZE * o.scalar * (0.75 + Math.random() * 0.6)
		const color = o.colors ? o.colors[(Math.random() * o.colors.length) | 0] : null

		let el: HTMLElement
		if ('g' in item) {
			// Letter / emoji particle.
			const span = document.createElement('span')
			span.textContent = item.g
			span.style.fontSize = `${size.toFixed(1)}px`
			span.style.lineHeight = '1'
			if (o.fontFamily) span.style.fontFamily = o.fontFamily
			if (color) span.style.color = color
			if (o.weightRange) {
				const [wa, wb] = o.weightRange
				const w = Math.round(wa + Math.random() * (wb - wa))
				span.style.fontVariationSettings = `"wght" ${w}`
				span.style.fontWeight = String(w) // fallback for non-variable fonts
			}
			el = span
		} else {
			// Geometric shape particle (classic paper confetti).
			const div = document.createElement('div')
			div.style.width = `${size.toFixed(1)}px`
			div.style.height = `${(item.s === 'strip' ? size * 0.45 : size).toFixed(1)}px`
			div.style.background = color ?? 'currentColor'
			if (item.s === 'circle') div.style.borderRadius = '50%'
			else if (item.s === 'strip') div.style.borderRadius = '1px'
			el = div
		}
		el.className = CONFETTI_TEXT_CLASSES.piece
		el.style.position = 'absolute'
		el.style.top = '0'
		el.style.left = '0'
		el.style.userSelect = 'none'
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
			burstId,
		})
	}
	layer.appendChild(frag)

	// Register the burst so step() can resolve it once its pieces retire (count > 0 guaranteed above).
	_bursts.set(burstId, { live: count, resolve: resolveFn, layer })
	if (!_raf) _raf = requestAnimationFrame(step)

	return burst
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
			const b = _bursts.get(p.burstId)
			if (b && --b.live <= 0) {
				b.layer.remove() // this burst's last piece retired — detach its layer
				b.resolve('completed')
				_bursts.delete(p.burstId)
			}
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
 * Fire a one-shot confetti burst made of the letters of `options.text` (plus any `symbols`/`shapes`).
 * Origin is a viewport fraction (default centre). Safe to call repeatedly — each burst gets its own
 * layer and shares one animation loop. No-op during SSR or (by default) when the user prefers reduced
 * motion.
 *
 * Returns a {@link ConfettiBurst}: a `Promise<ConfettiResult>` that resolves `'completed'` when the
 * burst finishes or `'cleared'` if cancelled, with a `.clear()` to cancel just this burst.
 *
 * @example const how = await confettiText({ text: 'Hooray', particleCount: 120 }) // 'completed' | 'cleared'
 * @example const burst = confettiText({ text: 'Yay' }); burst.clear() // cancel only this one
 */
export function confettiText(options: ConfettiTextOptions = {}): ConfettiBurst {
	if (typeof document === 'undefined' || !document.body) return resolvedBurst()
	const o = resolve(options)
	if (o.disableForReducedMotion && prefersReducedMotion()) return resolvedBurst()
	const originX = (options.origin?.x ?? 0.5) * window.innerWidth
	const originY = (options.origin?.y ?? 0.5) * window.innerHeight
	// If only symbols/shapes are given (no text), don't inject the 'Yay' default.
	const hasExtras = !!(options.symbols?.length || options.shapes?.length)
	const text = options.text ?? (hasExtras ? '' : 'Yay')
	return fireAt(originX, originY, toPool(text, options.symbols, options.shapes), o)
}

/**
 * Attach a click handler to `element` that bursts its own text from its on-screen position.
 * Returns a detach function. `options.text` overrides the element's text if provided.
 *
 * @example const detach = attachConfettiText(document.querySelector('h1')!)
 */
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
		const pool = toPool(options.text ?? element.textContent ?? 'Yay', options.symbols, options.shapes)
		fireAt(rect.left + rect.width / 2, rect.top + rect.height / 2, pool, o)
	}

	const onClick = (): void => fire()
	element.addEventListener('click', onClick)
	const undoKeyboard = makeKeyboardOperable(element, fire) // focus + Enter/Space for non-native elements

	return () => {
		element.removeEventListener('click', onClick)
		undoKeyboard()
	}
}

/**
 * Immediately remove every live particle across ALL bursts, cancel the loop, detach every burst's
 * layer, and resolve every pending burst `'cleared'`. To cancel a single burst instead, use the
 * `.clear()` on the {@link ConfettiBurst} that `confettiText()` returned.
 */
export function clearConfettiText(): void {
	for (const p of _pieces) p.el.remove()
	_pieces = []
	for (const b of _bursts.values()) {
		b.layer.remove()
		b.resolve('cleared')
	}
	_bursts.clear()
	stopLoopIfIdle()
}

// Dev-only: on hot-module replacement, clear in-flight confetti so the swapped-out module instance
// doesn't leave an orphaned layer/loop running. `import.meta.hot` is undefined in production builds,
// so this is a no-op for consumers.
const _hot = (import.meta as ImportMeta & { hot?: { dispose(cb: () => void): void } }).hot
if (_hot) _hot.dispose(() => clearConfettiText())
