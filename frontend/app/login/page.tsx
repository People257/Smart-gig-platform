"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/use-toast"
import { ArrowLeft, Briefcase, User } from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/lib/auth-context"
import { authApi } from "@/lib/api"

const usernameSchema = z.object({
  username: z.string().min(3, {
    message: "Username must be at least 3 characters.",
  }),
  password: z.string().min(6, {
    message: "Password must be at least 6 characters.",
  }),
})

export default function LoginPage() {
  const { toast } = useToast()
  const router = useRouter()
  const { login } = useAuth()
  
  // Login state
  const [isLoggingIn, setIsLoggingIn] = useState(false)

  // Debug output
  useEffect(() => {
    console.log("API URL:", process.env.NEXT_PUBLIC_API_URL)
    
    // Check backend connection
    import('@/lib/utils').then(({ checkBackendConnection }) => {
      checkBackendConnection().then(result => {
        console.log("Backend connection check:", result);
        if (!result.connected) {
          toast({
            variant: "destructive",
            title: "无法连接到后端API",
            description: "请确保后端服务已启动并在正确的端口运行",
          })
        }
      });
    });
  }, [])

  const usernameForm = useForm<z.infer<typeof usernameSchema>>({
    resolver: zodResolver(usernameSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  })

  const handleLogin = async (method: "username", data?: any) => {
    try {
      setIsLoggingIn(true)
      let loginData = {
        username: data.username,
        password: data.password,
        method: "username",
      }
      
      console.log("Attempting username login with:", data)
      console.log("Login data being sent:", loginData)
      
      // Call API directly to ensure the request is sent
      console.log("Calling authApi.login")
      const response = await authApi.login(loginData)
      console.log("API response:", response)
      
      if (response.success && response.data?.user) {
        const user = response.data.user
        console.log("Login successful, user:", user)
        
        toast({
          title: "Login successful",
          description: "You have been logged in successfully",
        })
        
        // Use context to keep state synchronized
        await login(loginData)
        
        router.push("/dashboard")
      } else {
        throw new Error(response.error || "Login failed")
      }
    } catch (error) {
      console.error("Login error:", error)
      toast({
        variant: "destructive",
        title: "Login failed",
        description: typeof error === 'string' ? error : 
          error instanceof Error ? error.message : 
          "Please check your credentials and try again",
      })
    } finally {
      setIsLoggingIn(false)
    }
  }

  const handleUsernameSubmit = async (data: z.infer<typeof usernameSchema>) => {
    await handleLogin("username", data)
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b">
        <div className="container flex h-16 items-center">
          <Link href="/" className="flex items-center gap-2 font-bold text-xl">
            <Briefcase className="h-6 w-6" />
            <span>智慧零工平台</span>
          </Link>
        </div>
      </header>
      <main className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>登录</CardTitle>
            <CardDescription>
              请输入您的用户名和密码登录
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...usernameForm}>
              <form onSubmit={usernameForm.handleSubmit(handleUsernameSubmit)} className="space-y-4">
                <FormField
                  control={usernameForm.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>用户名</FormLabel>
                      <FormControl>
                        <Input placeholder="输入您的用户名" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={usernameForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>密码</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="输入您的密码" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={isLoggingIn}>
                  {isLoggingIn ? "登录中..." : "登录"}
                </Button>
              </form>
            </Form>
          </CardContent>
          <CardFooter className="flex justify-center">
            <div className="text-sm">
              没有账号? <Link href="/register" className="text-blue-600 hover:underline">注册账户</Link>
            </div>
          </CardFooter>
        </Card>
      </main>
    </div>
  )
}
