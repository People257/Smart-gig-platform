"use client"

import { useState } from "react"
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

// 侧边栏导航项接口
interface NavItem {
  href: string
  label: string
  icon: React.ReactNode
  restrictTo?: string[]
}

export function Sidebar() {
  const pathname = usePathname()
  const { user, logout } = useAuth()
  const [isCollapsed, setIsCollapsed] = useState(false)
  
  // 导航项列表
  const navItems: NavItem[] = [
    {
      href: "/dashboard",
      label: "概览",
      icon: <HomeIcon className="h-5 w-5" />,
    },
    {
      href: "/dashboard/profile",
      label: "个人资料",
      icon: <UserIcon className="h-5 w-5" />,
    },
    {
      href: "/dashboard/tasks/create",
      label: "创建任务",
      icon: <FileTextIcon className="h-5 w-5" />,
      restrictTo: ["employer"],
    },
    {
      href: "/dashboard/tasks",
      label: "任务管理",
      icon: <FileTextIcon className="h-5 w-5" />,
    },
    {
      href: "/dashboard/payments",
      label: "财务管理",
      icon: <DollarSignIcon className="h-5 w-5" />,
    },
    {
      href: "/dashboard/settings",
      label: "设置",
      icon: <SettingsIcon className="h-5 w-5" />,
    },
    {
      href: "/dashboard/admin",
      label: "管理后台",
      icon: <BarChartIcon className="h-5 w-5" />,
      restrictTo: ["admin"],
    },
    {
      href: "/api-test",
      label: "API测试",
      icon: <FileTextIcon className="h-5 w-5" />,
    }
  ]
  
  // 过滤导航项，只显示当前用户可以访问的项
  const filteredNavItems = navItems.filter(item => {
    if (!item.restrictTo) return true
    if (!user || !user.user_type) return false
    return item.restrictTo.includes(user.user_type)
  })
  
  const handleLogout = async () => {
    await logout()
  }
  
  return (
    <aside className={`bg-white border-r h-screen sticky top-0 overflow-y-auto transition-all duration-300 ${
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