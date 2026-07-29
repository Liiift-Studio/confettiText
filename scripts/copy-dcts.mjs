// Copy every dist/**/*.d.ts to a sibling *.d.cts so the package's CJS `require` condition can serve
// CommonJS type declarations. Without this, node16/nodenext consumers using require() see the ESM
// .d.ts under "type":"module" as "masquerading as ESM" (flagged by @arethetypeswrong/cli).
// The declaration content is identical for both module systems; only the file extension differs, and
// extensionless relative imports inside a .d.cts resolve to sibling .d.cts files.
import { readdirSync, copyFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

let copied = 0
function walk(dir) {
	for (const entry of readdirSync(dir)) {
		const p = join(dir, entry)
		if (statSync(p).isDirectory()) walk(p)
		else if (p.endsWith('.d.ts')) {
			copyFileSync(p, `${p.slice(0, -'.d.ts'.length)}.d.cts`)
			copied++
		}
	}
}
walk('dist')
console.log(`Copied ${copied} .d.ts → .d.cts for the CJS require types condition`)
