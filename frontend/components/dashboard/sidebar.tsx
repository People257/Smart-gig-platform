"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import {
  HomeIcon,
  UserIcon,
  FileTextIcon,
  DollarSignIcon,
  SettingsIcon,
  LogOutIcon,
  BarChartIcon,
  MenuIcon,
  XIcon,
} from "@/components/ui/icons"
import { Star } from "lucide-react"

// 侧边栏导航项接口
interface NavItem {
  href: string
  label: string
  icon: React.ReactNode
  restrictTo?: string[]
  showInMobile?: boolean
}

export function Sidebar() {
  const pathname = usePathname()
  const { user, logout } = useAuth()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  
  // Check if we're on mobile
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
  
  // 导航项列表
  const navItems: NavItem[] = [
    {
      href: "/dashboard",
      label: "概览",
      icon: <HomeIcon className="h-5 w-5" />,
      showInMobile: true
    },
    {
      href: "/dashboard/profile",
      label: "个人资料",
      icon: <UserIcon className="h-5 w-5" />,
      showInMobile: true
    },
    {
      href: "/dashboard/tasks/create",
      label: "创建任务",
      icon: <FileTextIcon className="h-5 w-5" />,
      restrictTo: ["employer"]
    },
    {
      href: "/dashboard/tasks",
      label: "任务管理",
      icon: <FileTextIcon className="h-5 w-5" />,
      showInMobile: true
    },
    {
      href: "/dashboard/payments",
      label: "财务管理",
      icon: <DollarSignIcon className="h-5 w-5" />,
      showInMobile: true
    },
    {
      href: "/dashboard/reviews",
      label: "评价",
      icon: <Star className="h-5 w-5" />,
      showInMobile: true
    },
    {
      href: "/dashboard/settings",
      label: "设置",
      icon: <SettingsIcon className="h-5 w-5" />
    },
    {
      href: "/dashboard/admin",
      label: "管理后台",
      icon: <BarChartIcon className="h-5 w-5" />,
      restrictTo: ["admin"]
    }
  ]
  
  // 过滤导航项，只显示当前用户可以访问的项
  const filteredNavItems = navItems.filter(item => {
    if (!item.restrictTo) return true
    if (!user || !user.user_type) return false
    return item.restrictTo.includes(user.user_type)
  })
  
  // Mobile navigation items
  const mobileNavItems = filteredNavItems.filter(item => item.showInMobile)
  
  const handleLogout = async () => {
    await logout()
  }
  
  // Mobile bottom navigation
  if (isMobile) {
    return (
      <>
        {/* Mobile navigation */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t z-10 md:hidden">
          <div className="flex justify-around">
            {mobileNavItems.slice(0, 5).map((item) => {
              const isActive = pathname === item.href
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex flex-col items-center py-2 px-1 ${
                    isActive
                      ? "text-primary"
                      : "text-gray-600"
                  }`}
                >
                  <span>{item.icon}</span>
                  <span className="text-xs mt-1">{item.label}</span>
                </Link>
              )
            })}
          </div>
        </div>
      </>
    )
  }
  
  // Desktop sidebar
  return (
    <aside className={`bg-white border-r h-screen sticky top-0 overflow-y-auto transition-all duration-300 hidden md:block ${
      isCollapsed ? "w-16" : "w-64"
    }`}>
      <div className="p-4 border-b flex items-center justify-between">
        <h1 className={`font-bold text-xl transition-opacity duration-300 ${
          isCollapsed ? "opacity-0 w-0" : "opacity-100"
        }`}>
          零工平台
        </h1>
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1 rounded-md hover:bg-gray-100"
        >
          {isCollapsed ? (
            <MenuIcon className="h-5 w-5" />
          ) : (
            <XIcon className="h-5 w-5" />
          )}
        </button>
      </div>
      
      <nav className="p-2">
        <ul className="space-y-1">
          {filteredNavItems.map((item) => {
            const isActive = pathname === item.href
            
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center py-2 px-3 rounded-md transition-colors ${
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-gray-100"
                  }`}
                >
                  <span className="mr-3">{item.icon}</span>
                  <span className={`transition-opacity duration-300 ${
                    isCollapsed ? "opacity-0 w-0 hidden" : "opacity-100"
                  }`}>
                    {item.label}
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
      
      <div className="absolute bottom-0 w-full p-2 border-t">
        <Button
          variant="ghost"
          className={`w-full flex items-center justify-${isCollapsed ? "center" : "start"} py-2 px-3`}
          onClick={handleLogout}
        >
          <LogOutIcon className="h-5 w-5" />
          <span className={`ml-3 transition-opacity duration-300 ${
            isCollapsed ? "opacity-0 w-0 hidden" : "opacity-100"
          }`}>
            退出登录
          </span>
        </Button>
      </div>
    </aside>
  )
} 