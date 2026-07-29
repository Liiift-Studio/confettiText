// confettiText/src/react/useConfettiText.ts — React binding for the confetti burst.
// Returns a ref to attach to the source element plus an imperative `fire()`. By default the element
// bursts its own text on click; `trigger` switches to fire-on-mount, fire-on-scroll-into-view, or
// manual (call `fire()` yourself).
import { useCallback, useEffect, useRef } from 'react'
import { confettiText } from '../core/adjust'
import type { ConfettiTextOptions } from '../core/types'

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
 *
 * @param options - burst options plus a React-only `trigger` ('click' | 'mount' | 'inView' | 'manual')
 */
export function useConfettiText(options: ConfettiTextOptions = {}): ConfettiTextHandle {
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

		// 'click'
		const handler = (): void => fire()
		el.addEventListener('click', handler)
		return () => el.removeEventListener('click', handler)
	}, [trigger, fire])

	return { ref, fire }
}
