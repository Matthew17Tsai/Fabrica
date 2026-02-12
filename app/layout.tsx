import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Fabrica',
  description: 'Convert sketches to flat sketches and tech packs',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <nav className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16 items-center">
              <a href="/" className="text-2xl font-bold text-primary">
                Fabrica
              </a>
              <div className="flex gap-4">
                <a href="/new" className="text-secondary hover:text-gray-900 transition">
                  Upload design
                </a>
              </div>
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
