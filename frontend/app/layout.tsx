import type { Metadata } from 'next'
import './globals.css'
import { Toaster } from 'sonner'
import dynamic from 'next/dynamic'

// Use dynamic import with SSR disabled for AuthProvider to prevent chunk loading issues
const AuthProvider = dynamic(() => import('@/lib/auth-context').then(mod => mod.AuthProvider), { 
  ssr: false 
})

export const metadata: Metadata = {
  title: 'ZHLG Platform',
  description: 'A platform for connecting workers with employers',
  generator: 'v0.dev',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          {children}
          <Toaster position="top-right" />
        </AuthProvider>
      </body>
    </html>
  )
}
