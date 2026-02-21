import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Fabrica — Design to Price',
  description: 'Upload your design, confirm every detail, export a factory-ready tech pack with accurate costing.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <nav style={{ background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)' }}>
          <div className="max-w-screen-xl mx-auto px-6 h-14 flex items-center justify-between">
            <a
              href="/"
              className="text-base font-semibold tracking-tight"
              style={{ color: 'var(--color-text)' }}
            >
              Fabrica
            </a>
            <div className="flex items-center gap-6">
              <a
                href="/projects"
                className="text-sm"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                Projects
              </a>
              <a
                href="/new"
                className="text-sm px-3 py-1.5 rounded font-medium"
                style={{ background: 'var(--color-accent)', color: '#fff' }}
              >
                New Project
              </a>
            </div>
          </div>
        </nav>
        <main className="min-h-screen">
          {children}
        </main>
      </body>
    </html>
  )
}
