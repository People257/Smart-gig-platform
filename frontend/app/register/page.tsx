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
import { ArrowLeft, Briefcase, Mail, Phone, User } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/lib/auth-context"
import { authApi } from "@/lib/api"

export default function RegisterPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { register } = useAuth()

  // Registration method
  const [activeTab, setActiveTab] = useState("username")
  
  // User type
  const [userType, setUserType] = useState<"worker" | "employer">("worker")
  
  // Common fields
  const [name, setName] = useState("")
  
  // Phone registration fields
  const [phoneNumber, setPhoneNumber] = useState("")
  const [phoneVerificationCode, setPhoneVerificationCode] = useState("")
  
  // Email registration fields
  const [email, setEmail] = useState("")
  const [emailVerificationCode, setEmailVerificationCode] = useState("")
  
  // Username registration fields
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  
  // Verification code status
  const [phoneCountdown, setPhoneCountdown] = useState(0)
  const [emailCountdown, setEmailCountdown] = useState(0)
  
  // Loading states
  const [isSendingPhoneCode, setIsSendingPhoneCode] = useState(false)
  const [isSendingEmailCode, setIsSendingEmailCode] = useState(false)
  const [isRegistering, setIsRegistering] = useState(false)

  // Send phone verification code
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
        method: "register",
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

  // Send email verification code
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
        method: "register",
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

  // Register handler
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      // Basic validation
      if (activeTab === "username") {
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
      } else if (activeTab === "phone") {
        if (!phoneNumber || !phoneVerificationCode) {
          toast({
            variant: "destructive",
            title: "Missing required fields",
            description: "Please fill in your phone number and verification code",
          })
          return
        }
      } else if (activeTab === "email") {
        if (!email || !emailVerificationCode) {
          toast({
            variant: "destructive",
            title: "Missing required fields",
            description: "Please fill in your email and verification code",
          })
          return
        }
      }

      setIsRegistering(true)
      
      // Prepare registration data
      const registerData = {
        user_type: userType,
        method: activeTab,
        name: name || undefined,
        ...(activeTab === "username" 
          ? { 
              username, 
              password,
              email: email || undefined 
            } 
          : activeTab === "email"
          ? { 
              email, 
              verification_code: emailVerificationCode,
              password: password || undefined,
              username: username || undefined
            }
          : { 
              phone_number: phoneNumber, 
              verification_code: phoneVerificationCode 
            })
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
          <CardTitle className="text-2xl text-center">Create Account</CardTitle>
          <CardDescription className="text-center">
            Enter your information to create an account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRegister} className="space-y-6">
            <div className="space-y-4">
              <Label>User Type</Label>
              <RadioGroup 
                value={userType} 
                onValueChange={(value) => setUserType(value as "worker" | "employer")}
                className="flex space-x-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="worker" id="worker" />
                  <Label htmlFor="worker">Worker</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="employer" id="employer" />
                  <Label htmlFor="employer">Employer</Label>
                </div>
              </RadioGroup>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="name">Name (Optional)</Label>
              <Input
                id="name"
                type="text"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3 mb-4">
                <TabsTrigger value="username" className="flex items-center gap-2">
                  <User className="h-4 w-4" /> Username
                </TabsTrigger>
                <TabsTrigger value="email" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" /> Email
                </TabsTrigger>
                <TabsTrigger value="phone" className="flex items-center gap-2">
                  <Phone className="h-4 w-4" /> Phone
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="username" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    type="text"
                    placeholder="Enter a username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email-optional">Email (Optional)</Label>
                  <Input
                    id="email-optional"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="At least 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
              </TabsContent>
              
              <TabsContent value="email" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email-code">Verification Code</Label>
                  <div className="flex space-x-2">
                    <Input
                      id="email-code"
                      placeholder="Enter verification code"
                      value={emailVerificationCode}
                      onChange={(e) => setEmailVerificationCode(e.target.value)}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleSendEmailCode}
                      disabled={isSendingEmailCode || emailCountdown > 0 || !email || !email.includes('@')}
                      className="whitespace-nowrap"
                    >
                      {emailCountdown > 0 ? `${emailCountdown}s` : (isSendingEmailCode ? "Sending..." : "Get Code")}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email-password">Password (Optional)</Label>
                  <Input
                    id="email-password"
                    type="password"
                    placeholder="Create a password (optional)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Setting a password allows you to log in without verification code next time
                  </p>
                </div>
                {password && (
                  <div className="space-y-2">
                    <Label htmlFor="email-username">Username (Optional)</Label>
                    <Input
                      id="email-username"
                      type="text"
                      placeholder="Create a username (optional)"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                    />
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="phone" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="Enter your phone number"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone-code">Verification Code</Label>
                  <div className="flex space-x-2">
                    <Input
                      id="phone-code"
                      placeholder="Enter verification code"
                      value={phoneVerificationCode}
                      onChange={(e) => setPhoneVerificationCode(e.target.value)}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleSendPhoneCode}
                      disabled={isSendingPhoneCode || phoneCountdown > 0 || phoneNumber.length < 11}
                      className="whitespace-nowrap"
                    >
                      {phoneCountdown > 0 ? `${phoneCountdown}s` : (isSendingPhoneCode ? "Sending..." : "Get Code")}
                    </Button>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
            
            <Button
              type="submit"
              className="w-full"
              disabled={isRegistering}
            >
              {isRegistering ? "Creating Account..." : "Register"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center">
          <div className="text-sm text-center">
            Already have an account?{" "}
            <Link href="/login" className="text-blue-600 hover:underline">
              Sign in
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
