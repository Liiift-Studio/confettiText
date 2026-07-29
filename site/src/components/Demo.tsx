// Demo.tsx — interactive confettiText burst, driven by the real @liiift-studio/confettitext library.
'use client'

import { useCallback, useRef, useState } from 'react'
import { confettiText } from '@liiift-studio/confettitext'

/** Festive palette matching the tool's brand — passed as `colors` when the toggle is on. */
const FESTIVE = ['#ff5d8f', '#ffd166', '#06d6a0', '#8a7cff', '#f2a25c', '#e9e2d8']

export default function Demo() {
	const headlineRef = useRef<HTMLHeadingElement>(null)
	const [particleCount, setCount] = useState(90)
	const [spread, setSpread] = useState(64)
	const [startVelocity, setVel] = useState(38)
	const [gravity, setGravity] = useState(1.1)
	const [scalar, setScalar] = useState(1.4)
	const [festive, setFestive] = useState(true)

	const fire = useCallback(() => {
		const el = headlineRef.current
		if (!el || typeof window === 'undefined') return
		const r = el.getBoundingClientRect()
		confettiText({
			text: el.textContent || 'Hooray',
			particleCount,
			spread,
			startVelocity,
			gravity,
			scalar,
			colors: festive ? FESTIVE : null,
			origin: {
				x: (r.left + r.width / 2) / window.innerWidth,
				y: (r.top + r.height / 2) / window.innerHeight,
			},
		})
	}, [particleCount, spread, startVelocity, gravity, scalar, festive])

	return (
		<div className="flex flex-col gap-10">
			{/* Stage */}
			<div className="flex flex-col items-center gap-6 py-6 text-center">
				<h3
					ref={headlineRef}
					contentEditable
					suppressContentEditableWarning
					spellCheck={false}
					onClick={fire}
					aria-label="Editable headline — click to burst it into confetti"
					className="text-5xl lg:text-7xl outline-none cursor-pointer select-none rounded-lg px-3 py-1 focus:ring-2 focus:ring-[#ff5d8f]/50"
					style={{ fontFamily: 'var(--font-merriweather), serif', fontVariationSettings: '"wght" 500', maxWidth: '14ch' }}
				>
					Hooray
				</h3>
				<button
					onClick={fire}
					className="rounded-full px-7 py-3 text-base font-semibold text-[#1a0f13] transition-transform active:scale-95 hover:-translate-y-0.5"
					style={{ background: '#ff5d8f', boxShadow: '0 6px 20px rgba(255,93,143,0.3)' }}
				>
					Fire 🎉
				</button>
				<p className="text-xs text-faint">Edit the word above · click it or hit the button to burst its letters</p>
			</div>

			{/* Controls */}
			<div className="grid grid-cols-2 sm:grid-cols-3 gap-x-8 gap-y-5">
				<Slider label="Particles" value={particleCount} min={12} max={220} step={1} onChange={setCount} />
				<Slider label="Spread°" value={spread} min={10} max={180} step={1} onChange={setSpread} />
				<Slider label="Launch velocity" value={startVelocity} min={10} max={70} step={1} onChange={setVel} />
				<Slider label="Gravity" value={gravity} min={0} max={3} step={0.1} onChange={setGravity} format={(v) => v.toFixed(1)} />
				<Slider label="Letter size" value={scalar} min={0.6} max={3.4} step={0.1} onChange={setScalar} format={(v) => v.toFixed(1)} />
				<label className="flex items-end gap-3 pb-1">
					<input type="checkbox" checked={festive} onChange={(e) => setFestive(e.target.checked)} className="h-4 w-4 accent-[#ff5d8f]" />
					<span className="text-sm text-muted">Festive colours</span>
				</label>
			</div>
		</div>
	)
}

/** A labelled range slider with a live tabular-nums readout. */
function Slider({
	label,
	value,
	min,
	max,
	step,
	onChange,
	format,
}: {
	label: string
	value: number
	min: number
	max: number
	step: number
	onChange: (v: number) => void
	format?: (v: number) => string
}) {
	return (
		<div className="flex flex-col gap-2">
			<label className="flex justify-between text-xs text-muted">
				<span>{label}</span>
				<span className="font-mono tabular-nums text-foreground">{format ? format(value) : value}</span>
			</label>
			<input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(+e.target.value)} aria-label={label} />
		</div>
	)
}
