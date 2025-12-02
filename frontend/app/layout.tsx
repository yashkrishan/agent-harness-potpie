import type { Metadata } from "next"
import { Source_Sans_3 } from "next/font/google"
import "./globals.css"
import { Toaster } from "@/components/ui/sonner"

const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-source-sans",
})

export const metadata: Metadata = {
  title: "potpie.ai",
  description: "Convert ideas into PRs - Automated workflow from idea to code",
  icons: {
    icon: "/logo-no-text.png",
    shortcut: "/logo-no-text.png",
    apple: "/logo-no-text.png",
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={sourceSans.variable}>
        {children}
        <Toaster />
      </body>
    </html>
  )
}
