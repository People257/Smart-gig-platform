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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/components/ui/use-toast"
import { ArrowLeft, Briefcase } from "lucide-react"
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

const phoneSchema = z.object({
  phone_number: z.string().min(11, {
    message: "Phone number must be at least 11 characters.",
  }),
  verification_code: z.string().min(4, {
    message: "Verification code must be at least 4 characters.",
  }),
})

export default function LoginPage() {
  const { toast } = useToast()
  const router = useRouter()
  const { login } = useAuth()
  const [loginMethod, setLoginMethod] = useState<"username" | "phone">("username")
  const [isSendingCode, setIsSendingCode] = useState(false)
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  const [phoneNumber, setPhoneNumber] = useState("")
  const [verificationCode, setVerificationCode] = useState("")

  // 调试输出
  useEffect(() => {
    console.log("API URL:", process.env.NEXT_PUBLIC_API_URL)
    
    // 检查后端连接
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

  const handleSendCode = async () => {
    if (!phoneNumber || phoneNumber.length < 11) {
      toast({
        variant: "destructive",
        title: "Invalid phone number",
        description: "Please enter a valid phone number",
      })
      return
    }

    try {
      setIsSendingCode(true)
      console.log("Sending verification code to:", phoneNumber)
      
      const response = await authApi.sendVerificationCode({
        phone_number: phoneNumber,
        method: "login",
      })
      
      console.log("Verification code response:", response)
      
      toast({
        title: "Verification code sent",
        description: "Please check your phone for the verification code",
      })
    } catch (error) {
      console.error("Error sending verification code:", error)
      toast({
        variant: "destructive",
        title: "Failed to send verification code",
        description: "Please try again later",
      })
    } finally {
      setIsSendingCode(false)
    }
  }

  const handleLogin = async (method: "username" | "phone", data?: any) => {
    try {
      setIsLoggingIn(true)
      let loginData: {
        method: "username" | "phone";
        username?: string;
        password?: string;
        phone_number?: string;
        verification_code?: string;
      }
      
      if (method === "username") {
        console.log("Attempting username login with:", data)
        loginData = {
          username: data.username,
          password: data.password,
          method: "username",
        }
      } else {
        console.log("Attempting phone login with:", { phone_number: phoneNumber, verification_code: verificationCode })
        loginData = {
          phone_number: phoneNumber,
          verification_code: verificationCode,
          method: "phone",
        }
      }
      
      console.log("Login data being sent:", loginData)
      
      // 直接调用API以确保请求发送
      console.log("直接调用authApi.login")
      const response = await authApi.login(loginData)
      console.log("直接API调用返回:", response)
      
      if (response.success && response.data?.user) {
        const user = response.data.user
        console.log("Login successful, user:", user)
        
        toast({
          title: "Login successful",
          description: "You have been logged in successfully",
        })
        
        // 仍然使用context以保持状态同步
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
        description: typeof error === 'string' ? error : "Please check your credentials and try again",
      })
    } finally {
      setIsLoggingIn(false)
    }
  }

  const handleUsernameSubmit = async (data: z.infer<typeof usernameSchema>) => {
    await handleLogin("username", data)
  }

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!phoneNumber || phoneNumber.length < 11) {
      toast({
        variant: "destructive",
        title: "Invalid phone number",
        description: "Please enter a valid phone number",
      })
      return
    }
    
    if (!verificationCode || verificationCode.length < 4) {
      toast({
        variant: "destructive",
        title: "Invalid verification code",
        description: "Please enter a valid verification code",
      })
      return
    }
    
    await handleLogin("phone")
  }
  
  // 直接测试API调用
  const testDirectApiCall = async () => {
    try {
      console.log("Testing direct API call")
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: "testuser",
          password: "password123",
          method: "username",
        }),
      })
      
      console.log("Direct API call response status:", response.status)
      const data = await response.json()
      console.log("Direct API call response data:", data)
      
      if (response.ok) {
        toast({
          title: "API测试成功",
          description: "登录API调用成功，请查看控制台日志",
        })
      } else {
        toast({
          variant: "destructive",
          title: "API测试失败",
          description: data.error || "未知错误",
        })
      }
    } catch (error) {
      console.error("Direct API call error:", error)
      toast({
        variant: "destructive",
        title: "API调用错误",
        description: error instanceof Error ? error.message : "网络错误",
      })
    }
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
            <div className="flex items-center gap-2">
              <Link href="/">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
              <CardTitle>登录账号</CardTitle>
            </div>
            <CardDescription>请选择登录方式并填写信息</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue={loginMethod} onValueChange={(value) => setLoginMethod(value as "username" | "phone")}>
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="username">Username</TabsTrigger>
                <TabsTrigger value="phone">Phone</TabsTrigger>
              </TabsList>
              <TabsContent value="username">
                <Form {...usernameForm}>
                  <form onSubmit={usernameForm.handleSubmit(handleUsernameSubmit)} className="space-y-4">
                    <FormField
                      control={usernameForm.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Username</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter your username" {...field} />
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
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="Enter your password" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" className="w-full" disabled={isLoggingIn}>
                      {isLoggingIn ? "Logging in..." : "Login"}
                    </Button>
                  </form>
                </Form>
              </TabsContent>
              <TabsContent value="phone">
                <form onSubmit={handlePhoneSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <FormLabel htmlFor="phone">Phone Number</FormLabel>
                    <div className="flex space-x-2">
                      <Input
                        id="phone"
                        placeholder="Enter your phone number"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleSendCode}
                        disabled={isSendingCode}
                      >
                        {isSendingCode ? "Sending..." : "Send Code"}
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <FormLabel htmlFor="code">Verification Code</FormLabel>
                    <Input
                      id="code"
                      placeholder="Enter verification code"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value)}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoggingIn}>
                    {isLoggingIn ? "Logging in..." : "Login"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
            
            {/* 添加一个测试按钮 */}
            <div className="mt-4">
              <Button 
                type="button" 
                variant="outline" 
                className="w-full"
                onClick={testDirectApiCall}
              >
                Test Direct API Call
              </Button>
            </div>
          </CardContent>
          <CardFooter>
            <Button
              className="w-full"
              type="button"
              onClick={() => router.push("/register")}
            >
              Register
            </Button>
          </CardFooter>
        </Card>
      </main>
    </div>
  )
}
