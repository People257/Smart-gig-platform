"use client"

import { useState, useEffect } from "react"
import type { ReactNode } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Bell,
  Briefcase,
  Calendar,
  CreditCard,
  FileText,
  Home,
  LogOut,
  Menu,
  MessageSquare,
  Settings,
  User,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { useMobile } from "@/hooks/use-mobile"

interface DashboardLayoutProps {
  children: ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname()
  const isMobile = useMobile()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // 这里将调用获取用户信息的API
    // async function fetchUserData() {
    //   try {
    //     const response = await fetch('/api/users/profile');
    //     if (!response.ok) throw new Error('获取用户信息失败');
    //     const userData = await response.json();
    //     setUser(userData);
    //   } catch (error) {
    //     console.error('获取用户信息失败:', error);
    //   } finally {
    //     setIsLoading(false);
    //   }
    // }

    // fetchUserData();

    // 模拟加载状态
    const timer = setTimeout(() => {
      setIsLoading(false)
      setUser({ name: "用户", email: "user@example.com" })
    }, 1000)

    return () => clearTimeout(timer)
  }, [])

  const navItems = [
    { href: "/dashboard", label: "首页", icon: Home },
    { href: "/dashboard/tasks", label: "任务管理", icon: FileText },
    { href: "/dashboard/schedule", label: "日程安排", icon: Calendar },
    { href: "/dashboard/payments", label: "支付结算", icon: CreditCard },
    { href: "/dashboard/profile", label: "个人资料", icon: User },
    { href: "/dashboard/settings", label: "账户设置", icon: Settings },
  ]

  const handleLogout = async () => {
    // 这里将调用登出API
    // try {
    //   const response = await fetch('/api/auth/logout', { method: 'POST' });
    //   if (!response.ok) throw new Error('登出失败');
    //   window.location.href = '/';
    // } catch (error) {
    //   console.error('登出失败:', error);
    // }

    // 模拟登出
    window.location.href = "/"
  }

  return (
    <div className="flex flex-col min-h-screen">
      <header className="border-b">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            {isMobile && (
              <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="md:hidden">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-64 p-0">
                  <div className="flex h-16 items-center border-b px-4">
                    <div className="flex items-center gap-2 font-bold text-xl">
                      <Briefcase className="h-6 w-6" />
                      <span>智慧零工平台</span>
                    </div>
                    <Button variant="ghost" size="icon" className="ml-auto" onClick={() => setIsMenuOpen(false)}>
                      <X className="h-5 w-5" />
                    </Button>
                  </div>
                  <nav className="flex flex-col gap-1 p-4">
                    {navItems.map((item) => {
                      const Icon = item.icon
                      return (
                        <Link key={item.href} href={item.href} onClick={() => setIsMenuOpen(false)}>
                          <Button
                            variant={pathname === item.href ? "secondary" : "ghost"}
                            className="w-full justify-start"
                          >
                            <Icon className="mr-2 h-4 w-4" />
                            {item.label}
                          </Button>
                        </Link>
                      )
                    })}
                  </nav>
                </SheetContent>
              </Sheet>
            )}
            <div className="flex items-center gap-2 font-bold text-xl">
              <Briefcase className="h-6 w-6" />
              <span className="hidden sm:inline">智慧零工平台</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon">
              <Bell className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" className="hidden sm:flex">
              <MessageSquare className="h-5 w-5" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src="/placeholder.svg?height=32&width=32" alt="用户头像" />
                    <AvatarFallback>{isLoading ? "..." : user?.name?.charAt(0) || "用户"}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{isLoading ? "加载中..." : user?.name || "用户"}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {isLoading ? "..." : user?.email || "user@example.com"}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/profile">
                    <User className="mr-2 h-4 w-4" />
                    <span>个人资料</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/settings">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>账户设置</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>退出登录</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>
      <div className="flex-1 flex">
        <aside className="w-64 border-r bg-muted/40 hidden md:block">
          <nav className="flex flex-col gap-2 p-4">
            {navItems.map((item) => {
              const Icon = item.icon
              return (
                <Link key={item.href} href={item.href}>
                  <Button variant={pathname === item.href ? "secondary" : "ghost"} className="w-full justify-start">
                    <Icon className="mr-2 h-4 w-4" />
                    {item.label}
                  </Button>
                </Link>
              )
            })}
          </nav>
        </aside>
        <main className="flex-1 p-4 md:p-6 overflow-auto">{children}</main>
      </div>
    </div>
  )
}
