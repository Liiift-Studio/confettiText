// confettiText/src/core/a11y.ts — shared keyboard-operability shim for click-to-burst triggers.
// Used by both attachConfettiText (core) and the React click effect so the behavior lives in one place.

/** Tags that are focusable and fire `click` on Enter/Space natively — no keyboard shim needed. */
export const NATIVE_INTERACTIVE = new Set(['BUTTON', 'A', 'INPUT', 'SELECT', 'TEXTAREA', 'SUMMARY'])

/**
 * Make a non-natively-interactive element keyboard-operable: add an Enter/Space `keydown` that calls
 * `activate`, plus `tabindex="0"` and `role="button"` when the element has none. Returns a cleanup
 * function that removes the listener and any attributes this call added (never strips pre-existing ones).
 * Natively interactive elements are left untouched (they handle Enter/Space themselves).
 *
 * Note: on a semantic element (e.g. an `<h1>`), the added `role="button"` overrides its implicit role —
 * prefer `as="button"` (or `trigger="manual"`) when the element's semantics matter to assistive tech.
 */
export function makeKeyboardOperable(el: HTMLElement, activate: () => void): () => void {
	if (NATIVE_INTERACTIVE.has(el.tagName)) return () => {}

	const onKey = (e: KeyboardEvent): void => {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault()
			activate()
		}
	}
	el.addEventListener('keydown', onKey)

	let addedTabIndex = false
	let addedRole = false
	if (!el.hasAttribute('tabindex')) {
		el.tabIndex = 0
		addedTabIndex = true
	}
	if (!el.hasAttribute('role')) {
		el.setAttribute('role', 'button')
		addedRole = true
	}

	return () => {
		el.removeEventListener('keydown', onKey)
		if (addedTabIndex) el.removeAttribute('tabindex')
		if (addedRole) el.removeAttribute('role')
	}
}
