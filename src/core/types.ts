// confettiText/src/core/types.ts — types and class constants

/** Burst origin as a fraction of the viewport (0,0 = top-left · 1,1 = bottom-right). */
export interface ConfettiOrigin {
	/** Horizontal position, 0..1 across the viewport width (default 0.5). */
	x: number
	/** Vertical position, 0..1 down the viewport height (default 0.5). */
	y: number
}

/** When a React `<ConfettiText>` / `useConfettiText` binding fires its burst. */
export type ConfettiTrigger = 'click' | 'mount' | 'inView' | 'manual'

/**
 * Options controlling a confettiText burst. The physics knobs mirror `canvas-confetti`, so the
 * defaults feel familiar; `text`, `colors`, and `weightRange` are the typographic additions.
 */
export interface ConfettiTextOptions {
	/**
	 * The text whose letters become confetti pieces. Whitespace is stripped and the remaining
	 * characters are cycled through the particles. When a burst originates from an element
	 * (`attachConfettiText`, the React click trigger), this defaults to that element's text.
	 * (default: 'Yay')
	 */
	text?: string
	/** How many letter-particles to emit (default: 70). */
	particleCount?: number
	/** Launch direction in degrees — 90 points straight up, 0 points right (default: 90). */
	angle?: number
	/** Angular spread of the burst in degrees; wider = more fan-out (default: 62). */
	spread?: number
	/** Initial launch speed in px/frame; higher = the burst throws further (default: 34). */
	startVelocity?: number
	/** Per-frame velocity retention (air resistance) — closer to 1 = floatier (default: 0.9). */
	decay?: number
	/** Downward pull added each frame; higher = pieces fall faster (default: 1.1). */
	gravity?: number
	/** Constant horizontal bias added each frame, e.g. a breeze; negative drifts left (default: 0). */
	drift?: number
	/** Particle lifetime in frames before it fades out and is removed (default: 200). */
	ticks?: number
	/** Letter-size multiplier applied to the base ~18px particle size (default: 1). */
	scalar?: number
	/** Where the burst originates, as viewport fractions (default: { x: 0.5, y: 0.5 }). */
	origin?: ConfettiOrigin
	/**
	 * Palette the letters are randomly coloured from. Pass `null` (or an empty array) to leave the
	 * letters uncoloured so they inherit `currentColor` — the monochrome, on-brand look.
	 * (default: the festive DEFAULT_COLORS palette)
	 */
	colors?: string[] | null
	/**
	 * `[min, max]` variable-font weight; each particle is assigned a random `wght` in this range as
	 * it launches, so the burst has typographic texture. Requires a variable font on the page (it
	 * also sets `font-weight` as a fallback). Pass `null` to disable. (default: [400, 700])
	 */
	weightRange?: [number, number] | null
	/** Font family for the particles. Defaults to inheriting the page/element font. */
	fontFamily?: string
	/** Disable the 3D paper-flip tumble (letters stay flat as they spin) (default: false). */
	flat?: boolean
	/** z-index of the fixed confetti layer appended to `<body>` (default: 9999). */
	zIndex?: number
	/** Skip the burst entirely when the user prefers reduced motion (default: true). */
	disableForReducedMotion?: boolean
	/**
	 * React-only: when the `useConfettiText` / `<ConfettiText>` binding fires.
	 * Ignored by the imperative `confettiText()` core. (default: 'click')
	 */
	trigger?: ConfettiTrigger
}

/** Default festive palette used when `colors` is not specified. */
export const DEFAULT_COLORS = ['#ff5d8f', '#ffd166', '#06d6a0', '#8a7cff', '#f2a25c', '#e9e2d8'] as const

/** CSS class names applied to confettiText's generated markup — use these to target it. */
export const CONFETTI_TEXT_CLASSES = {
	/** The fixed, full-viewport layer appended to `<body>` that holds the pieces. */
	layer: 'ct-layer',
	/** An individual letter-particle span. */
	piece: 'ct-piece',
} as const
