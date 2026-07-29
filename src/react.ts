// confettiText/src/react.ts — React bindings entry ('@liiift-studio/confettitext/react').
// Kept separate from the main entry so vanilla consumers importing from '@liiift-studio/confettitext'
// never pull React into their graph. Shares the SAME core module instance as the main entry (rollup
// hoists core/adjust into one shared chunk), so `clearConfettiText()` and per-burst `.clear()` work
// across both import paths.
export { useConfettiText } from './react/useConfettiText'
export type { ConfettiTextHandle } from './react/useConfettiText'
export { ConfettiText } from './react/ConfettiText'
// Re-export the core surface a React consumer is likely to want from one import.
export { confettiText, attachConfettiText, clearConfettiText } from './core/adjust'
export type { ConfettiBurst, ConfettiResult } from './core/adjust'
export type { ConfettiTextOptions, ReactConfettiTextOptions, ConfettiOrigin, ConfettiTrigger, ConfettiShape } from './core/types'
export { CONFETTI_TEXT_CLASSES, DEFAULT_COLORS } from './core/types'
