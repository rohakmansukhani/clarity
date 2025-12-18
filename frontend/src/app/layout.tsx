import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import ThemeRegistry from '@/theme/ThemeRegistry'
import ContextMenu from '@/components/ui/ContextMenu'
import FloatingAdvisor from '@/components/ui/FloatingAdvisor'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Clarity AI | Financial Advisor',
  description: 'AI-powered financial insights for the Indian market',
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
