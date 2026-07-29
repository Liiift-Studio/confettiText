// confettiText landing page — a confetti cannon made of your letters
import Demo from "@/components/Demo"
import Hero from "@/components/Hero"
import CodeBlock from "@/components/CodeBlock"
import { version } from "../../../package.json"
import { version as siteVersion } from "../../package.json"
import SiteFooter from "../components/SiteFooter"
import PortsSection from "../components/PortsSection"

/** JSON-LD structured data for rich search results */
const jsonLd = {
	'@context': 'https://schema.org',
	'@type': 'SoftwareApplication',
	name: 'Confetti Text',
	url: 'https://confettitext.com',
	applicationCategory: 'DeveloperApplication',
	operatingSystem: 'Any',
	description: 'Fire a confetti burst where every particle is a real letter of your text — DOM letter-spans with physics, variable-font weight jitter, and a canvas-confetti-familiar API. Zero dependencies, React + vanilla JS.',
	offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
	programmingLanguage: 'TypeScript',
}

export default function Home() {
	return (
		<>
		<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
		<main className="flex flex-col items-center px-6 py-20 gap-24">

			{/* Hero */}
			<Hero
				eyebrow="letter confetti burst"
				title={[{ text: "Your text," }, { text: "as confetti.", italic: true, subtle: true }]}
				install="@liiift-studio/confettitext"
				github="https://github.com/Liiift-Studio/confettiText"
				tech={["TypeScript", "Zero dependencies", "React + Vanilla JS"]}
			>
				<p className="text-base leading-relaxed max-w-lg">
					A confetti cannon where every piece is a real letter of your own text — not a paper rectangle on a canvas, but a DOM letter-span that arcs out, tumbles through 3D, and falls. The physics are <code>canvas-confetti</code>&rsquo;s, so it feels familiar; the letters carry variable-font weight jitter, so the burst reads as type. Click to fire.
				</p>
			</Hero>

			{/* Demo */}
			<section className="w-full max-w-2xl lg:max-w-5xl flex flex-col gap-4">
				<h2 className="text-xs uppercase tracking-[0.18em] font-medium text-muted">Live demo — click the word, or hit Fire</h2>
				<div className="rounded-xl -mx-8 px-8 py-8" style={{ background: "var(--panel)", overflow: 'hidden' }}>
					<Demo />
				</div>
			</section>

			{/* Explanation */}
			<section className="w-full max-w-2xl lg:max-w-5xl flex flex-col gap-6">
				<h2 className="text-xs uppercase tracking-[0.18em] font-medium text-muted">How it works</h2>
				<div className="prose-grid grid grid-cols-1 sm:grid-cols-3 gap-12 text-sm leading-relaxed">
					<div className="flex flex-col gap-3">
						<p className="font-semibold text-base">Real letters, real DOM</p>
						<p>Each particle is a <span className="font-mono text-xs">&lt;span&gt;</span> holding one letter of your text, cycled through the burst. They live in a single fixed, <span className="font-mono text-xs">pointer-events: none</span> layer appended to <span className="font-mono text-xs">&lt;body&gt;</span> — so the confetti floats above everything without intercepting clicks, and every piece renders with your real (variable) font.</p>
					</div>
					<div className="flex flex-col gap-3">
						<p className="font-semibold text-base">Cannon kinematics</p>
						<p>Ported from <span className="font-mono text-xs">canvas-confetti</span>: each piece launches with randomised velocity inside the spread cone, loses speed to per-frame <span className="font-mono text-xs">decay</span>, and is pulled down by <span className="font-mono text-xs">gravity</span>. A <span className="font-mono text-xs">scaleY(cos(tilt))</span> term gives the paper flip-through-3D tumble. One <span className="font-mono text-xs">requestAnimationFrame</span> loop drives every live burst and retires spent pieces.</p>
					</div>
					<div className="flex flex-col gap-3">
						<p className="font-semibold text-base">Accessibility &amp; reduced motion</p>
						<p>The confetti layer is <span className="font-mono text-xs">aria-hidden</span> — it&rsquo;s decorative and never announced. When <span className="font-mono text-xs">prefers-reduced-motion: reduce</span> is set, bursts are skipped entirely by default (opt back in with <span className="font-mono text-xs">disableForReducedMotion: false</span>). The demo above honours the preference too.</p>
					</div>
				</div>
			</section>

			{/* Usage */}
			<section className="w-full max-w-2xl lg:max-w-5xl flex flex-col gap-6">
				<div className="flex items-baseline gap-4">
					<h2 className="text-xs uppercase tracking-[0.18em] font-medium text-muted">Usage</h2>
				</div>
				<div className="flex flex-col gap-8 text-sm">
					<div className="flex flex-col gap-3">
						<p className="text-muted">Drop-in component — click to burst its own text</p>
						<CodeBlock code={`import { ConfettiText } from '@liiift-studio/confettitext/react'

<ConfettiText as="h1" particleCount={120} spread={80}>
  Congrats!
</ConfettiText>`} />
					</div>
					<div className="flex flex-col gap-3">
						<p className="text-muted">Hook — imperative fire()</p>
						<CodeBlock code={`import { useConfettiText } from '@liiift-studio/confettitext/react'

const { ref, fire } = useConfettiText({ particleCount: 90 })
<h1 ref={ref}>You did it</h1>
<button onClick={() => fire()}>Celebrate</button>`} />
					</div>
					<div className="flex flex-col gap-3">
						<p className="text-muted">Vanilla JS</p>
						<CodeBlock code={`import { confettiText, attachConfettiText, clearConfettiText } from '@liiift-studio/confettitext'

// One-off burst from the viewport centre:
confettiText({ text: 'Hooray', particleCount: 120, spread: 90 })

// Or make an element burst its own text on click:
const detach = attachConfettiText(document.querySelector('h1'))

// Cancel everything in flight:
clearConfettiText()`} />
					</div>
					<div className="flex flex-col gap-3">
						<p className="text-muted">Options</p>
						<table className="w-full text-xs">
							<caption className="sr-only">ConfettiText options reference</caption>
							<thead>
								<tr className="text-subtle text-left">
									<th scope="col" className="pb-2 pr-6 font-normal">Option</th>
									<th scope="col" className="pb-2 pr-6 font-normal">Default</th>
									<th scope="col" className="pb-2 font-normal">Description</th>
								</tr>
							</thead>
							<tbody className="text-muted zebra">
								<tr className="hover:bg-foreground/5 transition-colors"><td className="py-2 pr-6 font-mono">text</td><td className="py-2 pr-6">element text</td><td className="py-2">The word/phrase whose letters become confetti. Whitespace is stripped; letters cycle through the pieces (emoji stay whole). Defaults to the bound element&rsquo;s text.</td></tr>
								<tr className="hover:bg-foreground/5 transition-colors"><td className="py-2 pr-6 font-mono">symbols</td><td className="py-2 pr-6">&mdash;</td><td className="py-2">Extra glyphs (emoji, symbols) mixed into the pool alongside the letters. Pair with <span className="font-mono">{`text: ''`}</span> for an all-emoji burst, e.g. <span className="font-mono">{`['🎉','✨','⭐']`}</span>.</td></tr>
								<tr className="hover:bg-foreground/5 transition-colors"><td className="py-2 pr-6 font-mono">particleCount</td><td className="py-2 pr-6">70</td><td className="py-2">How many letter-particles to emit.</td></tr>
								<tr className="hover:bg-foreground/5 transition-colors"><td className="py-2 pr-6 font-mono">angle</td><td className="py-2 pr-6">90</td><td className="py-2">Launch direction in degrees — 90 points straight up, 0 points right.</td></tr>
								<tr className="hover:bg-foreground/5 transition-colors"><td className="py-2 pr-6 font-mono">spread</td><td className="py-2 pr-6">62</td><td className="py-2">Angular spread of the burst in degrees; wider fans out more.</td></tr>
								<tr className="hover:bg-foreground/5 transition-colors"><td className="py-2 pr-6 font-mono">startVelocity</td><td className="py-2 pr-6">34</td><td className="py-2">Initial launch speed (px/frame); higher throws further.</td></tr>
								<tr className="hover:bg-foreground/5 transition-colors"><td className="py-2 pr-6 font-mono">decay</td><td className="py-2 pr-6">0.9</td><td className="py-2">Per-frame velocity retention (air resistance). Closer to 1 = floatier.</td></tr>
								<tr className="hover:bg-foreground/5 transition-colors"><td className="py-2 pr-6 font-mono">gravity</td><td className="py-2 pr-6">1.1</td><td className="py-2">Downward pull per frame; higher = pieces fall faster.</td></tr>
								<tr className="hover:bg-foreground/5 transition-colors"><td className="py-2 pr-6 font-mono">drift</td><td className="py-2 pr-6">0</td><td className="py-2">Constant horizontal bias (a breeze); negative drifts left.</td></tr>
								<tr className="hover:bg-foreground/5 transition-colors"><td className="py-2 pr-6 font-mono">ticks</td><td className="py-2 pr-6">200</td><td className="py-2">Particle lifetime in frames before it fades out.</td></tr>
								<tr className="hover:bg-foreground/5 transition-colors"><td className="py-2 pr-6 font-mono">scalar</td><td className="py-2 pr-6">1</td><td className="py-2">Letter-size multiplier on the base ~18px particle size.</td></tr>
								<tr className="hover:bg-foreground/5 transition-colors"><td className="py-2 pr-6 font-mono">origin</td><td className="py-2 pr-6">{`{ x: 0.5, y: 0.5 }`}</td><td className="py-2">Burst origin as viewport fractions. The React bindings set this from the element&rsquo;s position automatically.</td></tr>
								<tr className="hover:bg-foreground/5 transition-colors"><td className="py-2 pr-6 font-mono">colors</td><td className="py-2 pr-6">festive palette</td><td className="py-2">Palette the letters are randomly coloured from. Pass <span className="font-mono">null</span> to leave them <span className="font-mono">currentColor</span> (monochrome).</td></tr>
								<tr className="hover:bg-foreground/5 transition-colors"><td className="py-2 pr-6 font-mono">weightRange</td><td className="py-2 pr-6">[400, 700]</td><td className="py-2">Variable-font <span className="font-mono">wght</span> jitter — each piece gets a random weight in range. Pass <span className="font-mono">null</span> to disable.</td></tr>
								<tr className="hover:bg-foreground/5 transition-colors"><td className="py-2 pr-6 font-mono">flat</td><td className="py-2 pr-6">false</td><td className="py-2">Disable the 3D paper-flip tumble (letters stay flat as they spin).</td></tr>
								<tr className="hover:bg-foreground/5 transition-colors"><td className="py-2 pr-6 font-mono">disableForReducedMotion</td><td className="py-2 pr-6">true</td><td className="py-2">Skip the burst entirely when the user prefers reduced motion.</td></tr>
								<tr className="hover:bg-foreground/5 transition-colors"><td className="py-2 pr-6 font-mono">trigger</td><td className="py-2 pr-6">&apos;click&apos;</td><td className="py-2">React-only: &apos;click&apos; | &apos;mount&apos; | &apos;inView&apos; | &apos;manual&apos;. When the binding fires.</td></tr>
							</tbody>
						</table>
					</div>
				</div>
			</section>

			<PortsSection
				npm="@liiift-studio/confettitext"
				bundle="confettitext"
				repo="Liiift-Studio/confettiText"
			/>

			<SiteFooter current="confettiText" npmVersion={version} siteVersion={siteVersion} />

		</main>
		</>
	)
}
