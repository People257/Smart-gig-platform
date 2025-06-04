"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Briefcase, User } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/lib/auth-context"
import { authApi } from "@/lib/api"

export default function RegisterPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { register } = useAuth()
  
  // User type
  const [userType, setUserType] = useState<"worker" | "employer">("worker")
  
  // Common fields
  const [name, setName] = useState("")
  
  // Username registration fields
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [email, setEmail] = useState("")
  
  // Loading states
  const [isRegistering, setIsRegistering] = useState(false)

  // Register handler
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      // Basic validation
      if (!username || !password || !confirmPassword) {
        toast({
          variant: "destructive",
          title: "Missing required fields",
          description: "Please fill in all required fields",
        })
        return
      }
      
      if (password !== confirmPassword) {
        toast({
          variant: "destructive",
          title: "Passwords do not match",
          description: "Please make sure your passwords match",
        })
        return
      }
      
      if (password.length < 6) {
        toast({
          variant: "destructive",
          title: "Password too short",
          description: "Password must be at least 6 characters long",
        })
        return
      }

      setIsRegistering(true)
      
      // Prepare registration data
      const registerData = {
        user_type: userType,
        method: "username",
        name: name || undefined,
        username, 
        password,
        email: email || undefined 
      }
      
      console.log("Register data:", registerData)
      
      // Call register function
      await register(registerData)
      
      toast({
        title: "Registration successful",
        description: "Your account has been created successfully",
      })
      
      router.push("/dashboard")
    } catch (error: any) {
      console.error("Registration error:", error)
      toast({
        variant: "destructive",
        title: "Registration failed",
        description: error.message || "An unexpected error occurred",
      })
    } finally {
      setIsRegistering(false)
    }
  }

  return (
    <div className="container flex items-center justify-center min-h-screen py-10">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center">创建账户</CardTitle>
          <CardDescription className="text-center">
            输入您的信息以创建账户
          </CardDescription>
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
                  <Label htmlFor="worker">工人</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="employer" id="employer" />
                  <Label htmlFor="employer">雇主</Label>
                </div>
              </RadioGroup>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="name">姓名（可选）</Label>
              <Input
                id="name"
                type="text"
                placeholder="您的姓名"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">用户名</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="输入用户名"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email-optional">电子邮箱（可选）</Label>
                <Input
                  id="email-optional"
                  type="email"
                  placeholder="输入您的电子邮箱"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">密码</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="至少6个字符"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">确认密码</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="确认您的密码"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            </div>
            
            <Button
              type="submit"
              className="w-full"
              disabled={isRegistering}
            >
              {isRegistering ? "创建账户中..." : "注册"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center">
          <div className="text-sm text-center">
            已有账户?{" "}
            <Link href="/login" className="text-blue-600 hover:underline">
              登录
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
