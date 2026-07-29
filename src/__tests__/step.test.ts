// confettiText/src/__tests__/step.test.ts — animation-loop tests.
// requestAnimationFrame is faked so frames can be advanced deterministically, exercising step()'s
// physics, opacity fade, retirement, idle-layer teardown, and mid-flight clear.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { confettiText, clearConfettiText } from '../core/adjust'
import { CONFETTI_TEXT_CLASSES } from '../core/types'

const layerSel = `.${CONFETTI_TEXT_CLASSES.layer}`
const pieceSel = `.${CONFETTI_TEXT_CLASSES.piece}`
const pieces = () => Array.from(document.querySelectorAll<HTMLElement>(pieceSel))

let frame: FrameRequestCallback[] = []
/** Run `n` animation frames worth of scheduled rAF callbacks. */
function flush(n: number): void {
	for (let i = 0; i < n; i++) {
		const cbs = frame
		frame = []
		for (const cb of cbs) cb(0)
	}
}

beforeEach(() => {
	clearConfettiText()
	document.body.innerHTML = ''
	frame = []
	vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => frame.push(cb))
	vi.stubGlobal('cancelAnimationFrame', () => {})
})
afterEach(() => {
	clearConfettiText()
	vi.unstubAllGlobals()
})

describe('step() animation loop', () => {
	it('advances pieces: writes a transform and fades opacity below 1', () => {
		confettiText({ text: 'x', particleCount: 4, ticks: 100 })
		flush(2) // frame 1 still reads tick 0 (opacity 1); it dips below 1 from frame 2 on
		const p = pieces()[0]
		expect(p.style.transform).toMatch(/translate\(/)
		const op = parseFloat(p.style.opacity)
		expect(op).toBeLessThan(1)
		expect(op).toBeGreaterThan(0)
	})

	it('opacity decreases across frames', () => {
		confettiText({ text: 'x', particleCount: 1, ticks: 10 })
		const p = pieces()[0]
		flush(1)
		const o1 = parseFloat(p.style.opacity)
		flush(1)
		const o2 = parseFloat(p.style.opacity)
		expect(o2).toBeLessThan(o1)
	})

	it('retires pieces after their ticks lifetime and removes the idle layer', () => {
		confettiText({ text: 'x', particleCount: 3, ticks: 2 })
		expect(pieces().length).toBe(3)
		expect(document.querySelector(layerSel)).toBeTruthy()
		flush(3)
		expect(pieces().length).toBe(0)
		// The empty full-viewport layer must not linger in the DOM.
		expect(document.querySelector(layerSel)).toBeNull()
	})

	it('flat:true keeps scaleY at 1 (no paper-flip tumble)', () => {
		confettiText({ text: 'x', particleCount: 1, ticks: 50, flat: true })
		flush(1)
		expect(pieces()[0].style.transform).toMatch(/scaleY\(1(\.0+)?\)/)
	})

	it('clearConfettiText mid-flight removes pieces and the layer', () => {
		confettiText({ text: 'x', particleCount: 5, ticks: 100 })
		flush(1)
		expect(pieces().length).toBe(5)
		clearConfettiText()
		expect(pieces().length).toBe(0)
		expect(document.querySelector(layerSel)).toBeNull()
	})
})

describe('resolve() clamps (self-DoS guard)', () => {
	it('caps a runaway particleCount', () => {
		confettiText({ text: 'x', particleCount: 100000, ticks: 5 })
		// Clamped to MAX_PARTICLE_COUNT (1000), further capped by MAX_LIVE_PIECES (3000).
		expect(pieces().length).toBeLessThanOrEqual(1000)
		expect(pieces().length).toBeGreaterThan(0)
	})

	it('sanitizes non-finite counts without crashing', () => {
		expect(() => confettiText({ text: 'x', particleCount: NaN, ticks: NaN })).not.toThrow()
		expect(pieces().length).toBe(0)
		expect(() => confettiText({ text: 'x', particleCount: Infinity, ticks: 5 })).not.toThrow()
	})
})

describe('burst promise + per-burst clear', () => {
	it('returns a ConfettiBurst (thenable with .clear) that resolves when finished', async () => {
		const burst = confettiText({ text: 'x', particleCount: 2, ticks: 2 })
		expect(typeof burst.then).toBe('function')
		expect(typeof burst.clear).toBe('function')
		flush(3) // drive both pieces to retirement
		await expect(burst).resolves.toBe('completed')
	})

	it('.clear() cancels only its own burst, leaving others running', () => {
		const a = confettiText({ text: 'a', particleCount: 3, ticks: 200 })
		confettiText({ text: 'b', particleCount: 4, ticks: 200 })
		expect(pieces().length).toBe(7)
		a.clear()
		expect(pieces().length).toBe(4) // only burst b's pieces remain
		expect(document.querySelector(layerSel)).toBeTruthy() // burst b's layer stays while it's in flight
	})

	it('resolves "cleared" when a burst is cancelled, "completed" otherwise', async () => {
		const cancelled = confettiText({ text: 'x', particleCount: 5, ticks: 200 })
		flush(1)
		cancelled.clear()
		await expect(cancelled).resolves.toBe('cleared')

		const global = confettiText({ text: 'y', particleCount: 5, ticks: 200 })
		flush(1)
		clearConfettiText()
		await expect(global).resolves.toBe('cleared')
	})

	it('gives each concurrent burst its own layer at its own zIndex', () => {
		confettiText({ text: 'a', particleCount: 2, ticks: 200, zIndex: 100 })
		confettiText({ text: 'b', particleCount: 2, ticks: 200, zIndex: 5000 })
		const layers = Array.from(document.querySelectorAll<HTMLElement>(layerSel))
		expect(layers.length).toBe(2)
		expect(layers.map((l) => l.style.zIndex).sort()).toEqual(['100', '5000'])
	})

	it('a no-op burst (reduced motion) still returns a resolved ConfettiBurst', async () => {
		const spy = vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: true } as MediaQueryList)
		const burst = confettiText({ text: 'x', particleCount: 5 })
		expect(pieces().length).toBe(0)
		expect(typeof burst.clear).toBe('function')
		await expect(burst).resolves.toBe('completed')
		spy.mockRestore()
	})

	it('resolves immediately and spawns nothing when requestAnimationFrame is unavailable', async () => {
		vi.stubGlobal('requestAnimationFrame', undefined)
		const burst = confettiText({ text: 'x', particleCount: 10 })
		expect(pieces().length).toBe(0)
		expect(document.querySelector(layerSel)).toBeNull() // no empty layer attached
		await expect(burst).resolves.toBe('completed')
	})

	it('.clear() after a burst already finished is a safe no-op', () => {
		const burst = confettiText({ text: 'x', particleCount: 2, ticks: 2 })
		flush(3) // finish it naturally
		expect(() => burst.clear()).not.toThrow()
		expect(pieces().length).toBe(0)
	})
})
