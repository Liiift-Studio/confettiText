// confettiText/src/react/ConfettiText.tsx — drop-in component that bursts its children into confetti.
import React, { forwardRef, useCallback } from 'react'
import { useConfettiText } from './useConfettiText'
import type { ConfettiTextOptions } from '../core/types'

interface ConfettiTextProps extends ConfettiTextOptions {
	children: React.ReactNode
	className?: string
	style?: React.CSSProperties
	/** Element to render (default: 'span'). */
	as?: React.ElementType
	/** ARIA label for the source element. */
	'aria-label'?: string
	/** ARIA role override. */
	role?: string
}

/**
 * Renders its children as the confetti source text. With the default `trigger="click"`, clicking the
 * element bursts its letters from its on-screen position. Use `trigger="mount" | "inView" | "manual"`
 * for other timings; for `manual`, drive it with the {@link useConfettiText} hook instead.
 *
 * @example <ConfettiText as="h1" particleCount={120}>Congrats!</ConfettiText>
 */
export const ConfettiText = forwardRef<HTMLElement, ConfettiTextProps>(function ConfettiText(
	{ children, className, style, as: Tag = 'span', 'aria-label': ariaLabel, role, ...options },
	forwardedRef,
) {
	const { ref } = useConfettiText(options)

	// Merge the hook's ref with any forwarded ref so both are satisfied.
	const mergedRef = useCallback(
		(node: HTMLElement | null) => {
			ref.current = node
			if (typeof forwardedRef === 'function') {
				forwardedRef(node)
			} else if (forwardedRef) {
				forwardedRef.current = node
			}
		},
		[ref, forwardedRef],
	)

	return (
		<Tag
			ref={mergedRef as React.Ref<HTMLElement>}
			className={className}
			style={{ cursor: (options.trigger ?? 'click') === 'click' ? 'pointer' : undefined, ...style }}
			aria-label={ariaLabel}
			role={role}
		>
			{children}
		</Tag>
	)
})

ConfettiText.displayName = 'ConfettiText'
