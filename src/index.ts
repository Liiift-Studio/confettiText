// confettiText/src/index.ts — main entry: the framework-agnostic core (no React).
// React bindings live at the '@liiift-studio/confettitext/react' subpath so a vanilla consumer never
// pulls React into their bundle graph.
export { confettiText, attachConfettiText, clearConfettiText } from './core/adjust'
export type { ConfettiBurst } from './core/adjust'
export type { ConfettiTextOptions, ConfettiOrigin } from './core/types'
export { CONFETTI_TEXT_CLASSES, DEFAULT_COLORS } from './core/types'
