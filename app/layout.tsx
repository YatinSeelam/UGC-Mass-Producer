import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'UGC Generator',
  description: 'Generate UGC video variants with AI captions',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}


