// confettiText/src/__tests__/react.test.tsx — React binding tests (happy-dom)
import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup, fireEvent } from '@testing-library/react'
import { ConfettiText } from '../react/ConfettiText'
import { clearConfettiText } from '../core/adjust'
import { CONFETTI_TEXT_CLASSES } from '../core/types'

const pieceSel = `.${CONFETTI_TEXT_CLASSES.piece}`
const pieceCount = () => document.querySelectorAll(pieceSel).length

afterEach(() => {
	cleanup()
	clearConfettiText()
})

describe('<ConfettiText>', () => {
	it('bursts its children text on click (default trigger)', () => {
		const { getByText } = render(
			<ConfettiText as="h1" particleCount={5}>
				Yay
			</ConfettiText>,
		)
		fireEvent.click(getByText('Yay'))
		expect(pieceCount()).toBe(5)
	})

	it('does not attach a click burst when trigger is manual', () => {
		const { getByText } = render(
			<ConfettiText particleCount={5} trigger="manual">
				Nope
			</ConfettiText>,
		)
		fireEvent.click(getByText('Nope'))
		expect(pieceCount()).toBe(0)
	})

	it('fires on mount when trigger is mount', () => {
		render(
			<ConfettiText particleCount={7} trigger="mount">
				Hello
			</ConfettiText>,
		)
		expect(pieceCount()).toBe(7)
	})
})
