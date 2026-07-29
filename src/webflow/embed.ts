// confettiText/src/webflow/embed.ts — Webflow Custom Code Embed entry.
// Built as a minified IIFE (vite.webflow.config.ts) exposing window.ConfettiText with no module
// loader and no React. Drop one <script> into a Webflow embed, then call:
//   ConfettiText.attach(document.querySelector('h1'))   // click-to-burst
//   ConfettiText.fire({ text: 'Yay', particleCount: 120 })
import { confettiText, attachConfettiText, clearConfettiText } from '../core/adjust'

/** Fire a one-shot burst (see confettiText). */
export const fire = confettiText
/** Attach click-to-burst to an element; returns a detach function (see attachConfettiText). */
export const attach = attachConfettiText
/** Remove every live particle and detach the layer (see clearConfettiText). */
export const clear = clearConfettiText
