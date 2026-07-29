// vite.config.ts — library-mode build. Two entries: the framework-agnostic core (`index`) and the
// React bindings (`react`). Rollup hoists the shared core into a common chunk both entries import, so
// there is a single core module instance (one confetti layer / animation loop) across import paths.
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import dts from 'vite-plugin-dts'

export default defineConfig({
	plugins: [
		react(),
		// No rollupTypes: with multiple entries we emit per-file declarations so both index.d.ts and
		// react.d.ts (and the core/*.d.ts they reference) are produced.
		dts({ include: ['src'], exclude: ['src/__tests__/**'] }),
	],
	build: {
		lib: {
			entry: { index: 'src/index.ts', react: 'src/react.ts' },
			formats: ['es', 'cjs'],
			fileName: (format, entryName) => `${entryName}.${format === 'es' ? 'js' : 'cjs'}`,
		},
		rollupOptions: {
			external: ['react', 'react/jsx-runtime'],
		},
	},
})
