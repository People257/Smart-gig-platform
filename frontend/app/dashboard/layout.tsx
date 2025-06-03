"use client"

import React, { ReactNode, useEffect, useState } from "react"
import { redirect, useRouter } from "next/navigation"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { Sidebar } from "@/components/dashboard/sidebar"
import { TopBar } from "@/components/dashboard/topbar"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Home, FileText, CreditCard, Star } from "lucide-react"

interface DashboardLayoutProps {
  children: ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { isAuthenticated, isLoading, user } = useAuth()
  const router = useRouter()
  const [isRendering, setIsRendering] = useState(true)
  const [retryCount, setRetryCount] = useState(0)
  const [isMobile, setIsMobile] = useState(false)
  const MAX_RETRIES = 3

  // Check for mobile view
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    
    // Initial check
    checkIfMobile()
    
    // Listen for resize events
    window.addEventListener('resize', checkIfMobile)
    
    // Cleanup
    return () => window.removeEventListener('resize', checkIfMobile)
  }, [])
  
  useEffect(() => {
    // 仅在加载完成后判断认证状态
    if (!isLoading) {
      console.log("Dashboard layout auth state:", { isAuthenticated, user, isLoading });
      
      if (!isAuthenticated) {
        // 如果未认证，重定向到登录页
        console.log("User not authenticated, redirecting to login");
        router.push("/login");
      } else if (user) {
        // 用户已认证且有用户数据，允许渲染
        console.log("User authenticated and data available");
        setIsRendering(false);
      } else if (isAuthenticated && !user && retryCount < MAX_RETRIES) {
        // 奇怪的状态：认证但没有用户数据，可能是数据未加载完
        console.log("Authenticated but no user data, waiting...");
        
        // 等待一小段时间后重试
        const timer = setTimeout(() => {
          setRetryCount(prev => prev + 1);
          console.log(`Retry attempt ${retryCount + 1} of ${MAX_RETRIES}`);
        }, 500);
        
        return () => clearTimeout(timer);
      } else if (retryCount >= MAX_RETRIES) {
        // 多次重试后仍然没有用户数据，显示但提示错误
        console.error("Failed to load user data after multiple attempts");
        toast.error("加载用户数据失败，部分功能可能不可用");
        setIsRendering(false);
      }
    }
  }, [isAuthenticated, isLoading, user, router, retryCount]);

  // 加载中或正在等待用户数据时，显示加载状态
  if (isLoading || isRendering) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mb-4"></div>
          <p>加载中...</p>
          {retryCount > 0 && (
            <p className="text-sm text-muted-foreground mt-2">正在重试 ({retryCount}/{MAX_RETRIES})</p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* 侧边栏 */}
      <Sidebar />
      
      {/* 主内容区 */}
      <div className="flex-1 flex flex-col">
        <TopBar />
        
        <main className={`flex-1 p-6 ${isMobile ? 'pb-24' : ''}`}>
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </main>
      </div>
    </div>
  )
}

// 添加错误边界组件以捕获子组件中的错误
class ErrorBoundary extends React.Component<{children: ReactNode}, {hasError: boolean, error: any}> {
  constructor(props: {children: ReactNode}) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("Dashboard error caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 border rounded-md bg-red-50 text-red-800">
          <h2 className="text-xl font-bold mb-2">页面加载出错</h2>
          <p className="mb-4">加载此页面时发生错误，请刷新页面或返回首页重试。</p>
          <div className="flex gap-2">
            <button 
              onClick={() => window.location.reload()} 
              className="px-4 py-2 bg-red-100 hover:bg-red-200 rounded-md"
            >
              刷新页面
            </button>
            <a 
              href="/dashboard" 
              className="px-4 py-2 bg-primary text-white hover:bg-primary/90 rounded-md"
            >
              返回首页
            </a>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
