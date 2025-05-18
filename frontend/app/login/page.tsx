"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, Briefcase } from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/lib/auth-context"
import { authApi } from "@/lib/api"

export default function LoginPage() {
  const router = useRouter()
  const { login, loginWithPhone } = useAuth()

  const [activeTab, setActiveTab] = useState("username")
  const [phoneNumber, setPhoneNumber] = useState("")
  const [verificationCode, setVerificationCode] = useState("")
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [countdown, setCountdown] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  
  // 显示API URL用于调试
  useEffect(() => {
    console.log("API URL:", process.env.NEXT_PUBLIC_API_URL);
  }, []);

  const handleSendCode = async () => {
    if (phoneNumber.length === 11) {
      try {
        setIsLoading(true)
        console.log("发送验证码请求:", { phone_number: phoneNumber });
        const { success, message } = await authApi.sendVerificationCode({ phone_number: phoneNumber });
        console.log("验证码响应:", { success, message });
        
        if (success) {
          setCountdown(60)
          const timer = setInterval(() => {
            setCountdown((prev) => {
              if (prev <= 1) {
                clearInterval(timer)
                return 0
              }
              return prev - 1
            })
          }, 1000)
          
          toast.success(message || "验证码已发送，请查看您的手机短信");
        }
      } catch (error) {
        console.error("发送验证码错误:", error);
        toast.error("发送验证码失败: " + (error.message || "未知错误"));
      } finally {
        setIsLoading(false)
      }
    }
  }

  const handleLogin = async (e) => {
    e.preventDefault();
    console.log("登录尝试:", { activeTab, username, password, phoneNumber, verificationCode });

    try {
      setIsLoading(true)
      
      let success = false;
      
      if (activeTab === "phone") {
        if (phoneNumber && verificationCode) {
          console.log("手机号登录:", { phoneNumber, verificationCode });
          success = await loginWithPhone(phoneNumber, verificationCode);
          console.log("手机号登录结果:", success);
        } else {
          toast.error("请输入手机号和验证码");
        }
      } else {
        if (username && password) {
          console.log("用户名登录:", { username, password });
          success = await login(username, password);
          console.log("用户名登录结果:", success);
        } else {
          toast.error("请输入用户名和密码");
        }
      }

      if (success) {
        router.push("/dashboard");
      }
    } catch (error) {
      console.error("登录错误:", error);
      toast.error("登录失败: " + (error.message || "未知错误"));
    } finally {
      setIsLoading(false)
    }
  }

  // 直接调用登录API的测试函数
  const testDirectApiCall = async () => {
    try {
      console.log("直接API调用测试 - 开始");
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          method: 'username',
          username: username,
          password: password
        }),
      });
      console.log("API响应状态:", response.status);
      const data = await response.json();
      console.log("API响应数据:", data);
    } catch (error) {
      console.error("直接API调用错误:", error);
    }
  };

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
            <form onSubmit={handleLogin} className="space-y-6">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="phone">手机号登录</TabsTrigger>
                  <TabsTrigger value="username">用户名登录</TabsTrigger>
                </TabsList>
                <TabsContent value="phone" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">手机号</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="请输入手机号"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="code">验证码</Label>
                    <div className="flex space-x-2">
                      <Input
                        id="code"
                        placeholder="请输入验证码"
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value)}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleSendCode}
                        disabled={isLoading || countdown > 0 || phoneNumber.length !== 11}
                        className="whitespace-nowrap"
                      >
                        {countdown > 0 ? `${countdown}秒后重发` : "获取验证码"}
                      </Button>
                    </div>
                  </div>
                </TabsContent>
                <TabsContent value="username" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="username">用户名</Label>
                    <Input
                      id="username"
                      type="text"
                      placeholder="请输入用户名"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">密码</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="请输入密码"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                  <div className="text-right">
                    <Link href="/forgot-password" className="text-sm text-primary hover:underline">
                      忘记密码？
                    </Link>
                  </div>
                </TabsContent>
              </Tabs>
              
              {/* 调试按钮 */}
              <Button 
                type="button" 
                variant="outline" 
                onClick={testDirectApiCall} 
                className="w-full mt-4"
              >
                测试直接API调用
              </Button>
            </form>
          </CardContent>
          <CardFooter>
            <Button
              className="w-full"
              type="button"
              onClick={handleLogin}
              disabled={
                isLoading ||
                (activeTab === "phone" && (phoneNumber.length !== 11 || !verificationCode)) ||
                (activeTab === "username" && (!username || !password))
              }
            >
              {isLoading ? "登录中..." : "登录"}
            </Button>
          </CardFooter>
          <div className="px-8 pb-6 text-center">
            <p className="text-sm text-muted-foreground">
              还没有账号？{" "}
              <Link href="/register" className="text-primary hover:underline">
                立即注册
              </Link>
            </p>
          </div>
        </Card>
      </main>
    </div>
  )
}
