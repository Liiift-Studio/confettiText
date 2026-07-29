// confettiText/src/__tests__/adjust.test.ts — core burst engine tests (happy-dom)
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { confettiText, attachConfettiText, clearConfettiText } from '../core/adjust'
import { CONFETTI_TEXT_CLASSES } from '../core/types'

const layerSel = `.${CONFETTI_TEXT_CLASSES.layer}`
const pieceSel = `.${CONFETTI_TEXT_CLASSES.piece}`
const pieces = () => Array.from(document.querySelectorAll<HTMLElement>(pieceSel))

beforeEach(() => {
	clearConfettiText()
	document.body.innerHTML = ''
})
afterEach(() => clearConfettiText())

describe('confettiText', () => {
	it('creates a fixed, aria-hidden layer with particleCount letter-pieces', () => {
		confettiText({ text: 'AB', particleCount: 10 })
		const layer = document.querySelector<HTMLElement>(layerSel)
		expect(layer).toBeTruthy()
		expect(layer!.getAttribute('aria-hidden')).toBe('true')
		expect(layer!.style.position).toBe('fixed')
		expect(pieces().length).toBe(10)
	})

	it('cycles the source-text letters through the pieces', () => {
		confettiText({ text: 'AB', particleCount: 6 })
		expect(new Set(pieces().map((p) => p.textContent))).toEqual(new Set(['A', 'B']))
	})

	it('strips whitespace and falls back to a sparkle when the text is empty', () => {
		confettiText({ text: '   \n\t ', particleCount: 3 })
		expect(pieces().every((p) => p.textContent === '✦')).toBe(true)
	})

	it('colours pieces from the palette by default, leaves them uncoloured when colors is null', () => {
		confettiText({ text: 'x', particleCount: 5 })
		expect(pieces().every((p) => p.style.color !== '')).toBe(true)
		clearConfettiText()
		confettiText({ text: 'x', particleCount: 5, colors: null })
		expect(pieces().every((p) => p.style.color === '')).toBe(true)
	})

	it('assigns a wght within weightRange to every piece', () => {
		confettiText({ text: 'x', particleCount: 20, weightRange: [500, 500] })
		expect(pieces().every((p) => p.style.fontVariationSettings.includes('500'))).toBe(true)
	})

	it('reuses a single layer across repeated bursts', () => {
		confettiText({ text: 'x', particleCount: 4 })
		confettiText({ text: 'y', particleCount: 4 })
		expect(document.querySelectorAll(layerSel).length).toBe(1)
		expect(pieces().length).toBe(8)
	})

	it('respects prefers-reduced-motion', () => {
		const spy = vi
			.spyOn(window, 'matchMedia')
			.mockReturnValue({ matches: true } as MediaQueryList)
		confettiText({ text: 'x', particleCount: 10 })
		expect(pieces().length).toBe(0)
		spy.mockRestore()
	})

	it('still fires under reduced motion when disableForReducedMotion is false', () => {
		const spy = vi
			.spyOn(window, 'matchMedia')
			.mockReturnValue({ matches: true } as MediaQueryList)
		confettiText({ text: 'x', particleCount: 5, disableForReducedMotion: false })
		expect(pieces().length).toBe(5)
		spy.mockRestore()
	})
})

describe('attachConfettiText', () => {
	it('bursts the element text on click and detaches cleanly', () => {
		const h1 = document.createElement('h1')
		h1.textContent = 'Yay'
		document.body.appendChild(h1)

		const detach = attachConfettiText(h1, { particleCount: 6 })
		h1.click()
		expect(pieces().length).toBe(6)
		expect(new Set(pieces().map((p) => p.textContent))).toEqual(new Set(['Y', 'a', 'y']))

		clearConfettiText()
		detach()
		h1.click()
		expect(pieces().length).toBe(0)
	})

	it('prefers an explicit text option over the element text', () => {
		const el = document.createElement('div')
		el.textContent = 'ignored'
		document.body.appendChild(el)
		attachConfettiText(el, { particleCount: 3, text: 'Zz' })
		el.click()
		expect(new Set(pieces().map((p) => p.textContent))).toEqual(new Set(['Z', 'z']))
	})
})

describe('clearConfettiText', () => {
	it('removes the layer and all pieces', () => {
		confettiText({ text: 'x', particleCount: 8 })
		expect(document.querySelector(layerSel)).toBeTruthy()
		clearConfettiText()
		expect(document.querySelector(layerSel)).toBeNull()
		expect(pieces().length).toBe(0)
	})
})
