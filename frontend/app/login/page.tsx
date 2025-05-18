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
import { ArrowLeft, Briefcase, Mail, Phone, User } from "lucide-react"
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

const emailSchema = z.object({
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
  password: z.string().min(6, {
    message: "Password must be at least 6 characters.",
  }).optional(),
  verification_code: z.string().min(4, {
    message: "Verification code must be at least 4 characters.",
  }).optional(),
}).refine(data => data.password || data.verification_code, {
  message: "Either password or verification code is required",
  path: ["verification_code"],
});

export default function LoginPage() {
  const { toast } = useToast()
  const router = useRouter()
  const { login } = useAuth()
  const [loginMethod, setLoginMethod] = useState<"username" | "phone" | "email">("username")
  
  // Phone verification state
  const [isSendingPhoneCode, setIsSendingPhoneCode] = useState(false)
  const [phoneNumber, setPhoneNumber] = useState("")
  const [phoneVerificationCode, setPhoneVerificationCode] = useState("")
  const [phoneCountdown, setPhoneCountdown] = useState(0)
  
  // Email verification state
  const [isSendingEmailCode, setIsSendingEmailCode] = useState(false)
  const [email, setEmail] = useState("")
  const [emailPassword, setEmailPassword] = useState("")
  const [emailVerificationCode, setEmailVerificationCode] = useState("")
  const [emailCountdown, setEmailCountdown] = useState(0)
  const [emailLoginWithPassword, setEmailLoginWithPassword] = useState(true)
  
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

  const handleSendPhoneCode = async () => {
    if (!phoneNumber || phoneNumber.length < 11) {
      toast({
        variant: "destructive",
        title: "Invalid phone number",
        description: "Please enter a valid phone number",
      })
      return
    }

    try {
      setIsSendingPhoneCode(true)
      
      const response = await authApi.sendVerificationCode({
        phone_number: phoneNumber,
        target: "phone",
        method: "login",
      })
      
      setPhoneCountdown(60)
      const timer = setInterval(() => {
        setPhoneCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer)
            return 0
          }
          return prev - 1
        })
      }, 1000)
      
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
      setIsSendingPhoneCode(false)
    }
  }
  
  const handleSendEmailCode = async () => {
    if (!email || !email.includes('@') || !email.includes('.')) {
      toast({
        variant: "destructive",
        title: "Invalid email address",
        description: "Please enter a valid email address",
      })
      return
    }

    try {
      setIsSendingEmailCode(true)
      
      const response = await authApi.sendVerificationCode({
        email: email,
        target: "email",
        method: "login",
      })
      
      setEmailCountdown(60)
      const timer = setInterval(() => {
        setEmailCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer)
            return 0
          }
          return prev - 1
        })
      }, 1000)
      
      toast({
        title: "Verification code sent",
        description: "Please check your email for the verification code",
      })
    } catch (error) {
      console.error("Error sending verification code:", error)
      toast({
        variant: "destructive",
        title: "Failed to send verification code",
        description: "Please try again later",
      })
    } finally {
      setIsSendingEmailCode(false)
    }
  }

  const handleLogin = async (method: "username" | "phone" | "email", data?: any) => {
    try {
      setIsLoggingIn(true)
      let loginData: {
        method: string;
        username?: string;
        password?: string;
        phone_number?: string;
        email?: string;
        verification_code?: string;
      }
      
      if (method === "username") {
        console.log("Attempting username login with:", data)
        loginData = {
          username: data.username,
          password: data.password,
          method: "username",
        }
      } else if (method === "phone") {
        console.log("Attempting phone login with:", { phone_number: phoneNumber, verification_code: phoneVerificationCode })
        loginData = {
          phone_number: phoneNumber,
          verification_code: phoneVerificationCode,
          method: "phone",
        }
      } else { // email
        console.log("Attempting email login with:", { 
          email, 
          password: emailLoginWithPassword ? emailPassword : undefined,
          verification_code: emailLoginWithPassword ? undefined : emailVerificationCode 
        })
        loginData = {
          email: email,
          method: "email",
          ...(emailLoginWithPassword 
            ? { password: emailPassword }
            : { verification_code: emailVerificationCode })
        }
      }
      
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
    
    if (!phoneVerificationCode || phoneVerificationCode.length < 4) {
      toast({
        variant: "destructive",
        title: "Invalid verification code",
        description: "Please enter a valid verification code",
      })
      return
    }
    
    await handleLogin("phone")
  }
  
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email || !email.includes('@') || !email.includes('.')) {
      toast({
        variant: "destructive",
        title: "Invalid email address",
        description: "Please enter a valid email address",
      })
      return
    }
    
    if (emailLoginWithPassword) {
      if (!emailPassword || emailPassword.length < 6) {
        toast({
          variant: "destructive",
          title: "Invalid password",
          description: "Please enter a valid password (at least 6 characters)",
        })
        return
      }
    } else {
      if (!emailVerificationCode || emailVerificationCode.length < 4) {
        toast({
          variant: "destructive",
          title: "Invalid verification code",
          description: "Please enter a valid verification code",
        })
        return
      }
    }
    
    await handleLogin("email")
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
              请选择登录方式
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue={loginMethod} onValueChange={(v) => setLoginMethod(v as any)}>
              <TabsList className="grid w-full grid-cols-3 mb-6">
                <TabsTrigger value="username" className="flex items-center gap-2">
                  <User className="h-4 w-4" /> 用户名
                </TabsTrigger>
                <TabsTrigger value="email" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" /> 邮箱
                </TabsTrigger>
                <TabsTrigger value="phone" className="flex items-center gap-2">
                  <Phone className="h-4 w-4" /> 手机号
                </TabsTrigger>
              </TabsList>

              <TabsContent value="username">
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
              </TabsContent>
              
              <TabsContent value="email">
                <form onSubmit={handleEmailSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <FormLabel>邮箱地址</FormLabel>
                    <Input 
                      type="email"
                      placeholder="输入您的邮箱地址"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  
                  <div className="flex items-center space-x-2 text-sm">
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      className={emailLoginWithPassword ? "bg-primary/10" : ""}
                      onClick={() => setEmailLoginWithPassword(true)}
                    >
                      使用密码登录
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      className={!emailLoginWithPassword ? "bg-primary/10" : ""}
                      onClick={() => setEmailLoginWithPassword(false)}
                    >
                      使用验证码登录
                    </Button>
                  </div>
                  
                  {emailLoginWithPassword ? (
                    <div className="space-y-2">
                      <FormLabel>密码</FormLabel>
                      <Input 
                        type="password"
                        placeholder="输入您的密码"
                        value={emailPassword}
                        onChange={(e) => setEmailPassword(e.target.value)}
                      />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <FormLabel>验证码</FormLabel>
                      <div className="flex space-x-2">
                        <Input 
                          placeholder="输入验证码"
                          value={emailVerificationCode}
                          onChange={(e) => setEmailVerificationCode(e.target.value)}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleSendEmailCode}
                          disabled={isSendingEmailCode || emailCountdown > 0 || !email || !email.includes('@')}
                        >
                          {emailCountdown > 0 ? `${emailCountdown}s` : (isSendingEmailCode ? "发送中..." : "获取验证码")}
                        </Button>
                      </div>
                    </div>
                  )}
                  
                  <Button type="submit" className="w-full mt-6" disabled={isLoggingIn}>
                    {isLoggingIn ? "登录中..." : "登录"}
                  </Button>
                </form>
              </TabsContent>
              
              <TabsContent value="phone">
                <form onSubmit={handlePhoneSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <FormLabel>手机号</FormLabel>
                    <Input 
                      placeholder="输入您的手机号"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <FormLabel>验证码</FormLabel>
                    <div className="flex space-x-2">
                      <Input 
                        placeholder="输入验证码"
                        value={phoneVerificationCode}
                        onChange={(e) => setPhoneVerificationCode(e.target.value)}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleSendPhoneCode}
                        disabled={isSendingPhoneCode || phoneCountdown > 0 || phoneNumber.length < 11}
                      >
                        {phoneCountdown > 0 ? `${phoneCountdown}s` : (isSendingPhoneCode ? "发送中..." : "获取验证码")}
                      </Button>
                    </div>
                  </div>
                  
                  <Button type="submit" className="w-full" disabled={isLoggingIn}>
                    {isLoggingIn ? "登录中..." : "登录"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
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
