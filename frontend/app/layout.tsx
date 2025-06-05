import { Suspense } from 'react'
import type { Metadata } from 'next'
import './globals.css'
import { Toaster } from 'sonner'
import { ClientAuthProvider } from '@/lib/client-auth-provider'
import { ApiDebug } from '@/components/debug/ApiDebug'

// 导入API请求拦截补丁
import '@/lib/api-patch'

export const metadata: Metadata = {
  title: 'ZHLG Platform',
  description: 'A platform for connecting workers with employers',
  generator: 'v0.dev',
}

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="flex flex-col items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mb-4"></div>
        <p>页面加载中...</p>
      </div>
    </div>
  )
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>
        <Suspense fallback={<LoadingFallback />}>
          <ClientAuthProvider>
            <Suspense fallback={<LoadingFallback />}>
              {children}
            </Suspense>
            <Toaster position="top-right" />
            <ApiDebug />
          </ClientAuthProvider>
        </Suspense>
      </body>
    </html>
  )
}
