"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { BellIcon, UserIcon, MenuIcon } from "@/components/ui/icons"
import Link from "next/link"

export function TopBar() {
  const { user, logout } = useAuth()
  const [unreadNotifications] = useState(3)
  const [isMobile, setIsMobile] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  
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
  
  // 获取用户名首字母或默认头像
  const getInitials = () => {
    if (user?.username) {
      return user.username.charAt(0).toUpperCase()
    }
    return "U"
  }
  
  return (
    <div className="border-b bg-white px-4 py-3 sticky top-0 z-10">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          {isMobile && (
            <div className="mr-2">
              <Button variant="ghost" size="sm" className="md:hidden" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
                <MenuIcon className="h-5 w-5" />
              </Button>
            </div>
          )}
          <Link href="/dashboard" className="font-bold text-lg md:hidden">零工平台</Link>
        </div>
        
        <div className="flex items-center space-x-2 md:space-x-4">
          {/* 通知按钮 */}
          <div className="relative">
            <Button variant="ghost" size={isMobile ? "sm" : "icon"} className="rounded-full">
              <BellIcon className="h-5 w-5" />
              {unreadNotifications > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full text-xs w-5 h-5 flex items-center justify-center">
                  {unreadNotifications}
                </span>
              )}
            </Button>
          </div>
          
          {/* 用户菜单 */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="rounded-full p-px">
                <Avatar className={isMobile ? "h-7 w-7" : "h-8 w-8"}>
                  <AvatarImage src={user?.avatar || ""} />
                  <AvatarFallback>{getInitials()}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="p-2">
                <p className="font-medium">{user?.username || "用户"}</p>
                <p className="text-sm text-gray-500 truncate">
                  {user?.user_type === "worker" ? "零工用户" : 
                   user?.user_type === "employer" ? "雇主用户" : 
                   user?.user_type === "admin" ? "管理员" : "用户"}
                </p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <a href="/dashboard/profile" className="flex cursor-pointer">
                  <UserIcon className="mr-2 h-4 w-4" />
                  <span>个人资料</span>
                </a>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a href="/dashboard/settings" className="flex cursor-pointer">
                  <UserIcon className="mr-2 h-4 w-4" />
                  <span>账户设置</span>
                </a>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="text-red-500 focus:text-red-500" 
                onClick={() => logout()}
              >
                退出登录
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  )
} 