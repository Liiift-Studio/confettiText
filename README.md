# @liiift-studio/confettitext

A confetti cannon where every particle is a **real letter of your text** — not a paper rectangle on a canvas, but a DOM letter-span that arcs out, tumbles through 3D, and falls. The physics are ported from [`canvas-confetti`](https://github.com/catdad/canvas-confetti) so the burst feels familiar; the letters carry variable-font weight jitter, so it reads as type.

[![npm](https://img.shields.io/npm/v/%40liiift-studio%2Fconfettitext.svg)](https://www.npmjs.com/package/@liiift-studio/confettitext)
[![bundle size](https://img.shields.io/bundlephobia/minzip/%40liiift-studio%2Fconfettitext)](https://bundlephobia.com/package/@liiift-studio/confettitext)
[![license](https://img.shields.io/npm/l/%40liiift-studio%2Fconfettitext.svg)](./LICENSE)

**[▶ Try the live demo — confettitext.com](https://confettitext.com)**

- **Real letters, real DOM** — each piece is a `<span>` in your actual (variable) font, cycled from your text.
- **Familiar physics** — `particleCount`, `spread`, `angle`, `startVelocity`, `gravity`, `drift`, `decay`, `ticks`, `scalar`, `origin` behave just like canvas-confetti.
- **Typographic flourish** — per-particle `wght` jitter via `weightRange`, and a festive `colors` palette (or monochrome `currentColor`).
- **Zero dependencies**, framework-agnostic (vanilla core + optional React bindings), TypeScript-first.
- **Accessible** — the confetti layer is `aria-hidden`; bursts are skipped under `prefers-reduced-motion` by default.

## Install

```bash
npm install @liiift-studio/confettitext
```

## Quickstart

### React — drop-in component (click to burst its own text)

```tsx
import { ConfettiText } from '@liiift-studio/confettitext'

<ConfettiText as="h1" particleCount={120} spread={80}>
  Congrats!
</ConfettiText>
```

### React — hook with imperative `fire()`

```tsx
import { useConfettiText } from '@liiift-studio/confettitext'

const { ref, fire } = useConfettiText({ particleCount: 90 })

<h1 ref={ref}>You did it</h1>
<button onClick={() => fire()}>Celebrate</button>
```

The component/hook set `origin` from the element's on-screen position automatically, and use the element's own text unless you pass `text`. Switch timing with `trigger`: `'click'` (default), `'mount'`, `'inView'`, or `'manual'`.

### Vanilla JS

```ts
import { confettiText, attachConfettiText, clearConfettiText } from '@liiift-studio/confettitext'

// One-off burst from the viewport centre:
confettiText({ text: 'Hooray', particleCount: 120, spread: 90 })

// Make an element burst its own text on click; returns a detach fn:
const detach = attachConfettiText(document.querySelector('h1')!)

// Cancel everything in flight and remove the layer:
clearConfettiText()
```

### Webflow / no-code (one script tag)

```html
<script src="https://cdn.jsdelivr.net/npm/@liiift-studio/confettitext/dist/confettitext.webflow.min.js"></script>
<script>
  ConfettiText.attach(document.querySelector('h1'))          // click-to-burst
  // ConfettiText.fire({ text: 'Yay', particleCount: 120 })  // or fire directly
</script>
```

## Options

Every option is optional. Physics defaults mirror canvas-confetti.

| Option | Default | Description |
|---|---|---|
| `text` | element text | The word/phrase whose letters become confetti. Whitespace stripped; letters cycle through the pieces. |
| `particleCount` | `70` | How many letter-particles to emit. |
| `angle` | `90` | Launch direction in degrees — 90 = straight up, 0 = right. |
| `spread` | `62` | Angular spread of the burst in degrees. |
| `startVelocity` | `34` | Initial launch speed (px/frame). |
| `decay` | `0.9` | Per-frame velocity retention (air resistance). |
| `gravity` | `1.1` | Downward pull per frame. |
| `drift` | `0` | Constant horizontal bias; negative drifts left. |
| `ticks` | `200` | Particle lifetime in frames before it fades out. |
| `scalar` | `1` | Letter-size multiplier on the base ~18px particle size. |
| `origin` | `{ x: 0.5, y: 0.5 }` | Burst origin as viewport fractions. React bindings set this automatically. |
| `colors` | festive palette | Palette letters are randomly coloured from. Pass `null` for `currentColor` (monochrome). |
| `weightRange` | `[400, 700]` | Variable-font `wght` jitter per particle. Pass `null` to disable. |
| `fontFamily` | inherits | Font family for the particles. |
| `flat` | `false` | Disable the 3D paper-flip tumble. |
| `zIndex` | `9999` | z-index of the fixed confetti layer. |
| `disableForReducedMotion` | `true` | Skip the burst when the user prefers reduced motion. |
| `trigger` | `'click'` | React-only: `'click'` \| `'mount'` \| `'inView'` \| `'manual'`. |

## API

- `confettiText(options?)` — fire a one-shot burst (viewport-fraction `origin`).
- `attachConfettiText(element, options?)` → `() => void` — click-to-burst from an element's text/position; returns a detach fn.
- `clearConfettiText()` — remove every live particle, cancel the loop, detach the layer.
- `useConfettiText(options?)` → `{ ref, fire }` — React binding.
- `<ConfettiText as="span" …>children</ConfettiText>` — React component.
- `CONFETTI_TEXT_CLASSES` — `{ layer: 'ct-layer', piece: 'ct-piece' }` for targeting the generated markup.
- `DEFAULT_COLORS` — the festive palette used when `colors` is unspecified.

## How it works

Every character of your text is wrapped in an absolutely-positioned `<span>` inside a single fixed, `pointer-events: none` layer appended to `<body>`. Each frame, one `requestAnimationFrame` loop advances every live piece: `velocity` decays, `gravity`/`drift` accumulate, and a `scaleY(cos(tilt))` term produces the paper flip-through-3D tumble. Spent or off-screen pieces are removed; when none remain, the loop stops. It's all real DOM, so the letters render in your page's font and inherit variable-font axes.

## Compatibility

- Modern browsers with `requestAnimationFrame` (all evergreen browsers).
- React 17+ for the optional bindings (peer dependency; the vanilla core needs no framework).
- SSR-safe — every entry point no-ops when `document` is undefined.

## License

MIT © [Liiift Studio](https://liiift.studio)

---

Part of the [Liiift type-tools](https://github.com/Liiift-Studio/type-tools) suite.
