// confettiText/src/react/useConfettiText.ts — React binding for the confetti burst.
// Returns a ref to attach to the source element plus an imperative `fire()`. By default the element
// bursts its own text on click; `trigger` switches to fire-on-mount, fire-on-scroll-into-view, or
// manual (call `fire()` yourself).
import { useCallback, useEffect, useRef } from 'react'
import { confettiText } from '../core/adjust'
import type { ConfettiTextOptions, ReactConfettiTextOptions } from '../core/types'

/** Tags that fire `click` on Enter/Space natively — no keyboard shim needed. */
const NATIVE_INTERACTIVE = new Set(['BUTTON', 'A', 'INPUT', 'SELECT', 'TEXTAREA', 'SUMMARY'])

/** What `useConfettiText` returns. */
export interface ConfettiTextHandle {
	/** Attach to the element whose text should burst (and, for the `click` trigger, be clickable). */
	ref: React.RefObject<HTMLElement | null>
	/** Fire a burst imperatively from the element's position (or viewport centre if unattached). */
	fire: (overrides?: ConfettiTextOptions) => void
}

/**
 * React hook wrapping {@link confettiText}. The burst originates from the ref'd element and, unless
 * `text` is given, is made of that element's text. Respects `prefers-reduced-motion` via the core.
 * For the default `click` trigger the ref'd element is made keyboard-operable (focusable + Enter/Space)
 * unless it is already a natively interactive element.
 *
 * @param options - burst options plus a React-only `trigger` ('click' | 'mount' | 'inView' | 'manual')
 */
export function useConfettiText(options: ReactConfettiTextOptions = {}): ConfettiTextHandle {
	const ref = useRef<HTMLElement | null>(null)
	const optionsRef = useRef(options)
	optionsRef.current = options

	const fire = useCallback((overrides: ConfettiTextOptions = {}): void => {
		const opts = { ...optionsRef.current, ...overrides }
		const el = ref.current
		if (el && typeof window !== 'undefined') {
			const rect = el.getBoundingClientRect()
			confettiText({
				...opts,
				text: opts.text ?? el.textContent ?? undefined,
				// Inherit the element's own font so the burst matches the text it came from.
				fontFamily: opts.fontFamily ?? (typeof getComputedStyle === 'function' ? getComputedStyle(el).fontFamily : undefined),
				origin: {
					x: (rect.left + rect.width / 2) / window.innerWidth,
					y: (rect.top + rect.height / 2) / window.innerHeight,
				},
			})
		} else {
			confettiText(opts)
		}
	}, [])

	const trigger = options.trigger ?? 'click'

	useEffect(() => {
		const el = ref.current
		if (!el || trigger === 'manual') return

		if (trigger === 'mount') {
			fire()
			return
		}

		if (trigger === 'inView') {
			if (typeof IntersectionObserver === 'undefined') {
				fire()
				return
			}
			const io = new IntersectionObserver(
				(entries) => {
					if (entries[0].isIntersecting) {
						fire()
						io.disconnect()
					}
				},
				{ threshold: 0.4 },
			)
			io.observe(el)
			return () => io.disconnect()
		}

		// 'click' — plus keyboard operability for non-interactive elements (WCAG 2.1.1).
		const onClick = (): void => fire()
		const onKey = (e: KeyboardEvent): void => {
			if (e.key === 'Enter' || e.key === ' ') {
				e.preventDefault()
				fire()
			}
		}
		el.addEventListener('click', onClick)

		const shim = !NATIVE_INTERACTIVE.has(el.tagName)
		let addedTabIndex = false
		let addedRole = false
		if (shim) {
			el.addEventListener('keydown', onKey)
			if (!el.hasAttribute('tabindex')) {
				el.tabIndex = 0
				addedTabIndex = true
			}
			if (!el.hasAttribute('role')) {
				el.setAttribute('role', 'button')
				addedRole = true
			}
		}

		return () => {
			el.removeEventListener('click', onClick)
			if (shim) {
				el.removeEventListener('keydown', onKey)
				if (addedTabIndex) el.removeAttribute('tabindex')
				if (addedRole) el.removeAttribute('role')
			}
		}
	}, [trigger, fire])

	return { ref, fire }
}
