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
  
  // Phone registration fields
  const [phoneNumber, setPhoneNumber] = useState("")
  const [verificationCode, setVerificationCode] = useState("")
  
  // Username registration fields
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  
  // Verification code status
  const [countdown, setCountdown] = useState(0)
  
  // Loading states
  const [isSendingCode, setIsSendingCode] = useState(false)
  const [isRegistering, setIsRegistering] = useState(false)

  // Send verification code
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
        method: "register",
      })
      
      console.log("Verification code response:", response)
      
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
      } else {
        if (!phoneNumber || !verificationCode) {
          toast({
            variant: "destructive",
            title: "Missing required fields",
            description: "Please fill in your phone number and verification code",
          })
          return
        }
      }

      setIsRegistering(true)
      
      // Prepare registration data
      const registerData = {
        user_type: userType,
        method: activeTab,
        ...(activeTab === "username" 
          ? { username, password } 
          : { phone_number: phoneNumber, verification_code: verificationCode })
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
            
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="username">Username</TabsTrigger>
                <TabsTrigger value="phone">Phone</TabsTrigger>
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
                  <Label htmlFor="code">Verification Code</Label>
                  <div className="flex space-x-2">
                    <Input
                      id="code"
                      placeholder="Enter verification code"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value)}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleSendCode}
                      disabled={isSendingCode || countdown > 0 || phoneNumber.length < 11}
                      className="whitespace-nowrap"
                    >
                      {countdown > 0 ? `${countdown}s` : (isSendingCode ? "Sending..." : "Get Code")}
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
