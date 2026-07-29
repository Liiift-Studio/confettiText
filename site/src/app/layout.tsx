// Layout and metadata for the confettiText site — uses locally-hosted fonts, no Google Fonts
import type { Metadata } from "next"
import "./globals.css"
import SiteHeader from "../components/SiteHeader"

const TITLE = "Confetti Text — A confetti cannon made of your letters"
const DESC =
	"Fire a confetti burst where every particle is a real letter of your text — DOM letter-spans with physics, variable-font weight jitter, and a canvas-confetti-familiar API. React + vanilla JS."

export const metadata: Metadata = {
	title: TITLE,
	icons: { icon: "/icon.svg", shortcut: "/icon.svg", apple: "/icon.svg" },
	description: DESC,
	keywords: ["confetti text", "text confetti", "confetti letters", "celebration animation", "burst", "variable font", "typography", "TypeScript", "npm"],
	openGraph: {
		title: TITLE,
		description: DESC,
		url: "https://confettitext.com",
		siteName: "Confetti Text",
		type: "website",
	},
	twitter: {
		card: "summary_large_image",
		title: TITLE,
		description: DESC,
	},
	metadataBase: new URL("https://confettitext.com"),
	alternates: { canonical: "https://confettitext.com" },
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
	return (
		<html lang="en" className="h-full antialiased">
			<body className="min-h-full flex flex-col">
				<SiteHeader current="confettiText" githubUrl="https://github.com/Liiift-Studio/confettiText" />{children}</body>
		</html>
	)
}
