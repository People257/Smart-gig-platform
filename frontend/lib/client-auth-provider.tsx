"use client"

import { ReactNode, Suspense } from 'react'
import dynamic from 'next/dynamic'

// Use dynamic import with SSR disabled for AuthProvider to prevent chunk loading issues
const AuthProvider = dynamic(() => import('./auth-context').then(mod => mod.AuthProvider), { 
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center min-h-screen">
      <div className="flex flex-col items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mb-4"></div>
        <p>加载中...</p>
      </div>
    </div>
  )
})

export function ClientAuthProvider({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mb-4"></div>
          <p>加载中...</p>
        </div>
      </div>
    }>
      <AuthProvider>{children}</AuthProvider>
    </Suspense>
  )
} 