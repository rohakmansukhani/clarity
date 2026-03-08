import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import ThemeRegistry from '@/theme/ThemeRegistry'
import ContextMenu from '@/components/ui/ContextMenu'
import FloatingAdvisor from '@/components/ui/FloatingAdvisor'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Clarity | The Ease of Stock Research',
  description: 'Uncomplicate the market with AI-powered financial insights.',
  // Controls the browser chrome color on iOS Safari and Android Chrome
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0B0B0B' },
  ],
  viewport: {
    width: 'device-width',
    initialScale: 1,
    viewportFit: 'cover',  // Allows content to extend into safe areas
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeRegistry>
          <ContextMenu />
          {children}
          <FloatingAdvisor />
        </ThemeRegistry>
      </body>
    </html>
  )
}
