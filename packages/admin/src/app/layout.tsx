import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'API Gateway Admin',
  description: 'Admin panel for API Gateway management',
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
