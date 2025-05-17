"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, Briefcase } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export default function LoginPage() {
  const router = useRouter()
  const { toast } = useToast()

  const [activeTab, setActiveTab] = useState("phone")
  const [phoneNumber, setPhoneNumber] = useState("")
  const [verificationCode, setVerificationCode] = useState("")
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [countdown, setCountdown] = useState(0)
  const [isLoading, setIsLoading] = useState(false)

  const handleSendCode = async () => {
    if (phoneNumber.length === 11) {
      try {
        setIsLoading(true)
        // 这里将调用发送验证码的API
        // const response = await fetch('/api/auth/send-verification-code', {
        //   method: 'POST',
        //   headers: { 'Content-Type': 'application/json' },
        //   body: JSON.stringify({ phoneNumber })
        // });

        // if (!response.ok) throw new Error('发送验证码失败');

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

        toast({
          title: "验证码已发送",
          description: "请查看您的手机短信",
        })
      } catch (error) {
        toast({
          title: "发送失败",
          description: error.message,
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }
  }

  const handleLogin = async (e) => {
    e.preventDefault()

    try {
      setIsLoading(true)
      // 这里将调用登录API
      // const response = await fetch('/api/auth/login', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     method: activeTab,
      //     phoneNumber: activeTab === 'phone' ? phoneNumber : undefined,
      //     verificationCode: activeTab === 'phone' ? verificationCode : undefined,
      //     username: activeTab === 'username' ? username : undefined,
      //     password: activeTab === 'username' ? password : undefined,
      //   })
      // });

      // if (!response.ok) throw new Error('登录失败');
      // const data = await response.json();

      toast({
        title: "登录成功",
        description: "欢迎回到智慧零工平台",
      })

      // 登录成功后跳转到控制台
      router.push("/dashboard")
    } catch (error) {
      toast({
        title: "登录失败",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
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
            </form>
          </CardContent>
          <CardFooter>
            <Button
              className="w-full"
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
          <div className="px-6 pb-6 text-center text-sm">
            还没有账号？
            <Link href="/register" className="text-primary hover:underline ml-1">
              注册
            </Link>
          </div>
        </Card>
      </main>
    </div>
  )
}
