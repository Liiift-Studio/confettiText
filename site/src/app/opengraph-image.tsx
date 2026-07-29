// OG image for confettiText — tool theme colour, a scatter of festive letter-confetti, graceful font fallback
import { ImageResponse } from 'next/og'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

export const alt = 'Confetti Text — A confetti cannon made of your letters'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

/** Tool background: oklch(0.10 0.05 0) */
const BG = '#180d0d'
/** Foreground — main headline */
const FG = '#f7f0ee'
/** Muted — eyebrow, secondary text */
const MUTED = '#c3b2b0'
/** Subtle — domain */
const SUBTLE = '#9a8987'

/** Festive confetti-letter scatter above the headline. */
const CONFETTI = [
	{ ch: 'Y', color: '#ff5d8f', size: 46, rot: -18, mt: 30 },
	{ ch: 'o', color: '#ffd166', size: 34, rot: 20, mt: 8 },
	{ ch: 'u', color: '#06d6a0', size: 52, rot: -8, mt: 40 },
	{ ch: 'r', color: '#8a7cff', size: 30, rot: 26, mt: 0 },
	{ ch: 't', color: '#f2a25c', size: 44, rot: 12, mt: 22 },
	{ ch: 'e', color: '#ff5d8f', size: 36, rot: -24, mt: 6 },
	{ ch: 'x', color: '#06d6a0', size: 40, rot: 8, mt: 34 },
	{ ch: 't', color: '#ffd166', size: 32, rot: -14, mt: 12 },
]

export default async function Image() {
	/** Load local Inter 300 — fall back gracefully if the font file is missing */
	let interLight: Buffer | null = null
	try {
		interLight = await readFile(join(process.cwd(), 'public/fonts/inter-300.woff'))
	} catch {
		// Font unavailable — Satori will use its built-in fallback
	}
	const fonts = interLight ? [{ name: 'Inter', data: interLight, style: 'normal' as const, weight: 300 as const }] : []

	return new ImageResponse(
		(
			<div style={{ background: BG, width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '72px 80px', fontFamily: 'Inter, sans-serif' }}>
				{/* Eyebrow */}
				<span style={{ fontSize: 13, letterSpacing: '0.18em', color: MUTED, textTransform: 'uppercase' }}>confettitext</span>

				{/* Confetti-letter scatter + headline */}
				<div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
					<div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 40, height: 90 }}>
						{CONFETTI.map((c, i) => (
							<span key={i} style={{ fontSize: c.size, color: c.color, marginTop: c.mt, transform: `rotate(${c.rot}deg)`, fontFamily: 'serif', fontWeight: 700 }}>{c.ch}</span>
						))}
					</div>
					<div style={{ fontSize: 78, color: FG, lineHeight: 1.05, fontWeight: 300 }}>Your text,</div>
					<div style={{ fontSize: 78, color: MUTED, lineHeight: 1.05, fontWeight: 300, fontStyle: 'italic' }}>as confetti.</div>
				</div>

				{/* Footer */}
				<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
					<div style={{ fontSize: 14, color: MUTED, letterSpacing: '0.04em', display: 'flex', gap: 20 }}>
						<span>TypeScript</span><span style={{ opacity: 0.4 }}>·</span>
						<span>real letters, real physics</span><span style={{ opacity: 0.4 }}>·</span>
						<span>React + Vanilla JS</span>
					</div>
					<div style={{ fontSize: 13, color: SUBTLE, letterSpacing: '0.04em' }}>confettitext.com</div>
				</div>
			</div>
		),
		{ ...size, fonts },
	)
}
