"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useSearchParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
import { ArrowLeft, Briefcase } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export default function RegisterPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { toast } = useToast()

  const [userType, setUserType] = useState(searchParams.get("type") || "worker")
  const [activeTab, setActiveTab] = useState("phone")
  const [phoneNumber, setPhoneNumber] = useState("")
  const [verificationCode, setVerificationCode] = useState("")
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [agreed, setAgreed] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [countdown])

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

  const handleRegister = async (e) => {
    e.preventDefault()

    if (activeTab === "username" && password !== confirmPassword) {
      toast({
        title: "密码不匹配",
        description: "请确保两次输入的密码一致",
        variant: "destructive",
      })
      return
    }

    try {
      setIsLoading(true)
      // 这里将调用注册API
      // const response = await fetch('/api/auth/register', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     userType,
      //     method: activeTab,
      //     phoneNumber: activeTab === 'phone' ? phoneNumber : undefined,
      //     verificationCode: activeTab === 'phone' ? verificationCode : undefined,
      //     username: activeTab === 'username' ? username : undefined,
      //     password: activeTab === 'username' ? password : undefined,
      //   })
      // });

      // if (!response.ok) throw new Error('注册失败');
      // const data = await response.json();

      toast({
        title: "注册成功",
        description: "欢迎加入智慧零工平台",
      })

      // 注册成功后跳转到登录页
      router.push("/login")
    } catch (error) {
      toast({
        title: "注册失败",
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
              <CardTitle>注册账号</CardTitle>
            </div>
            <CardDescription>选择您的用户类型并填写注册信息</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleRegister} className="space-y-6">
              <div className="space-y-2">
                <Label>用户类型</Label>
                <RadioGroup value={userType} onValueChange={setUserType} className="flex space-x-4">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="worker" id="worker" />
                    <Label htmlFor="worker">我是零工</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="employer" id="employer" />
                    <Label htmlFor="employer">我是雇主</Label>
                  </div>
                </RadioGroup>
              </div>

              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="phone">手机号注册</TabsTrigger>
                  <TabsTrigger value="username">用户名注册</TabsTrigger>
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
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">确认密码</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      placeholder="请再次输入密码"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                  </div>
                </TabsContent>
              </Tabs>

              <div className="flex items-center space-x-2">
                <Checkbox id="terms" checked={agreed} onCheckedChange={(checked) => setAgreed(checked === true)} />
                <Label htmlFor="terms" className="text-sm">
                  我已阅读并同意
                  <Link href="/terms" className="text-primary hover:underline ml-1">
                    服务条款
                  </Link>
                  和
                  <Link href="/privacy" className="text-primary hover:underline ml-1">
                    隐私政策
                  </Link>
                </Label>
              </div>
            </form>
          </CardContent>
          <CardFooter>
            <Button
              className="w-full"
              onClick={handleRegister}
              disabled={
                isLoading ||
                (activeTab === "phone" && (phoneNumber.length !== 11 || !verificationCode)) ||
                (activeTab === "username" && (!username || !password || password !== confirmPassword)) ||
                !agreed
              }
            >
              {isLoading ? "注册中..." : "注册"}
            </Button>
          </CardFooter>
          <div className="px-6 pb-6 text-center text-sm">
            已有账号？
            <Link href="/login" className="text-primary hover:underline ml-1">
              登录
            </Link>
          </div>
        </Card>
      </main>
    </div>
  )
}
