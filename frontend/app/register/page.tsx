"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { ArrowLeft, Briefcase } from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/lib/auth-context"
import { authApi } from "@/lib/api"

export default function RegisterPage() {
  const router = useRouter()
  const { register } = useAuth()

  // 注册方式
  const [activeTab, setActiveTab] = useState("username")
  
  // 用户类型
  const [userType, setUserType] = useState<"worker" | "employer">("worker")
  
  // 手机号注册字段
  const [phoneNumber, setPhoneNumber] = useState("")
  const [verificationCode, setVerificationCode] = useState("")
  
  // 用户名注册字段
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  
  // 验证码发送状态
  const [countdown, setCountdown] = useState(0)
  
  // 加载状态
  const [isLoading, setIsLoading] = useState(false)

  // 发送验证码
  const handleSendCode = async () => {
    if (phoneNumber.length === 11) {
      try {
        setIsLoading(true)
        const { success, message } = await authApi.sendVerificationCode({ phone_number: phoneNumber });
        
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
        toast.error("发送验证码失败: " + (error.message || "未知错误"));
      } finally {
        setIsLoading(false)
      }
    }
  }

  // 注册处理
  const handleRegister = async (e) => {
    e.preventDefault()

    try {
      // 基本验证
      if (activeTab === "username") {
        if (!username || !password || !confirmPassword) {
          toast.error("请填写所有必填字段");
          return;
        }
        
        if (password !== confirmPassword) {
          toast.error("两次输入的密码不一致");
          return;
        }
        
        if (password.length < 6) {
          toast.error("密码长度不能少于6位");
          return;
        }
      } else {
        if (!phoneNumber || !verificationCode) {
          toast.error("请填写手机号和验证码");
          return;
        }
      }

      setIsLoading(true)
      
      // 准备注册数据
      const registerData = activeTab === "username" 
        ? { username, password } 
        : { phoneNumber, verificationCode };
      
      // 调用注册函数
      const success = await register(userType, activeTab as "username" | "phone", registerData);

      if (success) {
        toast.success("注册成功！");
        router.push("/dashboard");
      }
    } catch (error) {
      toast.error("注册失败: " + (error.message || "未知错误"));
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
            <CardDescription>选择注册方式并填写信息</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleRegister} className="space-y-6">
              <div className="space-y-4">
                <Label>用户类型</Label>
                <RadioGroup 
                  value={userType} 
                  onValueChange={(value) => setUserType(value as "worker" | "employer")}
                  className="flex space-x-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="worker" id="worker" />
                    <Label htmlFor="worker">我是工人</Label>
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
                      placeholder="请输入密码，至少6位"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">确认密码</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="请再次输入密码"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                  </div>
                </TabsContent>
              </Tabs>
            </form>
          </CardContent>
          <CardFooter>
            <Button
              className="w-full"
              onClick={handleRegister}
              disabled={
                isLoading ||
                (activeTab === "phone" && (phoneNumber.length !== 11 || !verificationCode)) ||
                (activeTab === "username" && (!username || !password || !confirmPassword))
              }
            >
              {isLoading ? "注册中..." : "注册"}
            </Button>
          </CardFooter>
          <div className="px-8 pb-6 text-center">
            <p className="text-sm text-muted-foreground">
              已有账号？{" "}
              <Link href="/login" className="text-primary hover:underline">
                立即登录
              </Link>
            </p>
          </div>
        </Card>
      </main>
    </div>
  )
}
