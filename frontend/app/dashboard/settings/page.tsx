"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Loader2 } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { userApi } from "@/lib/api"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

export default function SettingsPage() {
  const { user, logout, updateUser } = useAuth()
  const router = useRouter()
  
  // 加载状态
  const [isLoading, setIsLoading] = useState(false)
  const [isSavingAccount, setIsSavingAccount] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [isSavingNotifications, setIsSavingNotifications] = useState(false)
  const [isSavingPrivacy, setIsSavingPrivacy] = useState(false)
  const [isDeletingAccount, setIsDeletingAccount] = useState(false)
  
  // 账户设置状态
  const [username, setUsername] = useState("")
  const [email, setEmail] = useState("")
  const [phoneNumber, setPhoneNumber] = useState("")
  
  // 安全设置状态
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  
  // 通知设置状态
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [smsNotifications, setSmsNotifications] = useState(true)
  const [appNotifications, setAppNotifications] = useState(true)
  const [taskNotifications, setTaskNotifications] = useState(true)
  const [messageNotifications, setMessageNotifications] = useState(true)
  const [paymentNotifications, setPaymentNotifications] = useState(true)
  
  // 隐私设置状态
  const [profileVisibility, setProfileVisibility] = useState(true)
  const [showHourlyRate, setShowHourlyRate] = useState(true)
  const [showContactInfo, setShowContactInfo] = useState(false)
  
  // 初始化用户数据
  useEffect(() => {
    if (user) {
      setUsername(user.username || "")
      setEmail(user.email || "")
      setPhoneNumber(user.phone_number || "")
      
      // 如果用户有通知和隐私设置，也可以在这里初始化
      if (user.notification_preferences) {
        setEmailNotifications(user.notification_preferences.email_notifications ?? true)
        setSmsNotifications(user.notification_preferences.sms_notifications ?? true)
        setAppNotifications(user.notification_preferences.app_notifications ?? true)
        setTaskNotifications(user.notification_preferences.task_notifications ?? true)
        setMessageNotifications(user.notification_preferences.message_notifications ?? true)
        setPaymentNotifications(user.notification_preferences.payment_notifications ?? true)
      }
      
      if (user.privacy_settings) {
        setProfileVisibility(user.privacy_settings.profile_visibility ?? true)
        setShowHourlyRate(user.privacy_settings.show_hourly_rate ?? true)
        setShowContactInfo(user.privacy_settings.show_contact_info ?? false)
      }
    }
  }, [user])
  
  // 保存账户设置
  const handleSaveAccount = async () => {
    try {
      setIsSavingAccount(true)
      
      const response = await userApi.updateUserSettings({
        username,
        email,
        phone_number: phoneNumber
      })
      
      if (response.success && response.data) {
        toast.success("账户信息已更新")
        
        // 更新全局用户状态
        updateUser({
          username,
          email,
          phone_number: phoneNumber
        })
      } else {
        toast.error(response.error || "更新失败，请稍后重试")
      }
    } catch (error: any) {
      console.error("保存账户设置失败:", error)
      toast.error(error.message || "更新失败，请稍后重试")
    } finally {
      setIsSavingAccount(false)
    }
  }
  
  // 修改密码
  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast.error("两次输入的密码不一致")
      return
    }
    
    if (newPassword.length < 8) {
      toast.error("密码长度不能少于8位")
      return
    }
    
    try {
      setIsChangingPassword(true)
      
      const response = await userApi.changePassword({
        current_password: currentPassword,
        new_password: newPassword
      })
      
      if (response.success) {
        toast.success("密码已更新")
        setCurrentPassword("")
        setNewPassword("")
        setConfirmPassword("")
      } else {
        toast.error(response.error || "修改密码失败，请检查当前密码是否正确")
      }
    } catch (error: any) {
      console.error("修改密码失败:", error)
      toast.error(error.message || "修改密码失败，请稍后重试")
    } finally {
      setIsChangingPassword(false)
    }
  }
  
  // 保存通知设置
  const handleSaveNotifications = async () => {
    try {
      setIsSavingNotifications(true)
      
      const response = await userApi.updateUserSettings({
        notification_preferences: {
          email_notifications: emailNotifications,
          sms_notifications: smsNotifications,
          app_notifications: appNotifications,
          task_notifications: taskNotifications,
          message_notifications: messageNotifications,
          payment_notifications: paymentNotifications
        }
      })
      
      if (response.success) {
        toast.success("通知设置已更新")
        
        // 更新全局用户状态
        updateUser({
          notification_preferences: {
            email_notifications: emailNotifications,
            sms_notifications: smsNotifications,
            app_notifications: appNotifications,
            task_notifications: taskNotifications,
            message_notifications: messageNotifications,
            payment_notifications: paymentNotifications
          }
        })
      } else {
        toast.error(response.error || "更新通知设置失败")
      }
    } catch (error: any) {
      console.error("保存通知设置失败:", error)
      toast.error(error.message || "更新失败，请稍后重试")
    } finally {
      setIsSavingNotifications(false)
    }
  }
  
  // 保存隐私设置
  const handleSavePrivacy = async () => {
    try {
      setIsSavingPrivacy(true)
      
      const response = await userApi.updateUserSettings({
        privacy_settings: {
          profile_visibility: profileVisibility,
          show_hourly_rate: showHourlyRate,
          show_contact_info: showContactInfo
        }
      })
      
      if (response.success) {
        toast.success("隐私设置已更新")
        
        // 更新全局用户状态
        updateUser({
          privacy_settings: {
            profile_visibility: profileVisibility,
            show_hourly_rate: showHourlyRate,
            show_contact_info: showContactInfo
          }
        })
      } else {
        toast.error(response.error || "更新隐私设置失败")
      }
    } catch (error: any) {
      console.error("保存隐私设置失败:", error)
      toast.error(error.message || "更新失败，请稍后重试")
    } finally {
      setIsSavingPrivacy(false)
    }
  }
  
  // 删除账户处理
  const handleDeleteAccount = async () => {
    if (confirm("您确定要删除账户吗？此操作无法撤销。")) {
      try {
        setIsDeletingAccount(true)
        
        const response = await userApi.deleteAccount()
        
        if (response.success) {
          toast.success("账户已删除")
          await logout()
          router.push("/")
        } else {
          toast.error(response.error || "删除账户失败")
        }
      } catch (error: any) {
        console.error("删除账户失败:", error)
        toast.error(error.message || "删除账户失败，请稍后重试")
      } finally {
        setIsDeletingAccount(false)
      }
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">账户设置</h1>
        <p className="text-muted-foreground mt-1">
          管理您的账户信息、安全设置、通知和隐私设置
        </p>
      </div>
      
      <Tabs defaultValue="account" className="space-y-6">
        <TabsList className="grid w-full md:w-fit grid-cols-4">
          <TabsTrigger value="account">账户</TabsTrigger>
          <TabsTrigger value="security">安全</TabsTrigger>
          <TabsTrigger value="notifications">通知</TabsTrigger>
          <TabsTrigger value="privacy">隐私</TabsTrigger>
        </TabsList>
        
        {/* 账户设置 */}
        <TabsContent value="account" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>基本信息</CardTitle>
              <CardDescription>
                更新您的账户基本信息
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="username">用户名</Label>
                  <Input 
                    id="username" 
                    value={username} 
                    onChange={e => setUsername(e.target.value)}
                    placeholder="输入用户名" 
                  />
                  <p className="text-xs text-muted-foreground">
                    此用户名将显示在您的个人资料和任务中
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">电子邮箱</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    value={email} 
                    onChange={e => setEmail(e.target.value)}
                    placeholder="example@example.com" 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">手机号码</Label>
                  <Input 
                    id="phone" 
                    type="tel" 
                    value={phoneNumber} 
                    onChange={e => setPhoneNumber(e.target.value)}
                    placeholder="输入手机号码" 
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <Button 
                  onClick={handleSaveAccount} 
                  disabled={isSavingAccount}
                >
                  {isSavingAccount ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      保存中...
                    </>
                  ) : "保存更改"}
                </Button>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="text-destructive">
              <CardTitle>危险区域</CardTitle>
              <CardDescription>
                一旦删除您的账户，所有数据将永久丢失
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                variant="destructive" 
                onClick={handleDeleteAccount}
                disabled={isDeletingAccount}
              >
                {isDeletingAccount ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    处理中...
                  </>
                ) : "删除账户"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* 安全设置 */}
        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>修改密码</CardTitle>
              <CardDescription>
                定期更改密码可以提高账户安全性
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current-password">当前密码</Label>
                <Input 
                  id="current-password" 
                  type="password" 
                  value={currentPassword} 
                  onChange={e => setCurrentPassword(e.target.value)}
                  placeholder="输入当前密码" 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-password">新密码</Label>
                <Input 
                  id="new-password" 
                  type="password" 
                  value={newPassword} 
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="输入新密码" 
                />
                <p className="text-xs text-muted-foreground">
                  密码长度至少8位，包含字母和数字
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">确认新密码</Label>
                <Input 
                  id="confirm-password" 
                  type="password" 
                  value={confirmPassword} 
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="再次输入新密码" 
                />
              </div>
              <div className="flex justify-end">
                <Button 
                  onClick={handleChangePassword}
                  disabled={isChangingPassword}
                >
                  {isChangingPassword ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      更新中...
                    </>
                  ) : "更新密码"}
                </Button>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>登录历史</CardTitle>
              <CardDescription>
                查看您最近的登录活动
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-md border">
                <div className="p-4 flex justify-between items-center">
                  <div>
                    <p className="font-medium">广州市 - Chrome浏览器</p>
                    <p className="text-sm text-muted-foreground">今天 10:30</p>
                  </div>
                  <Badge>当前设备</Badge>
                </div>
                <Separator />
                <div className="p-4">
                  <p className="font-medium">深圳市 - Safari浏览器</p>
                  <p className="text-sm text-muted-foreground">昨天 15:45</p>
                </div>
                <Separator />
                <div className="p-4">
                  <p className="font-medium">北京市 - 移动应用</p>
                  <p className="text-sm text-muted-foreground">上周五 08:12</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* 通知设置 */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>通知方式</CardTitle>
              <CardDescription>
                选择您希望接收通知的方式
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="email-notifications">电子邮件通知</Label>
                  <p className="text-sm text-muted-foreground">
                    通过电子邮件接收平台重要通知
                  </p>
                </div>
                <Switch 
                  id="email-notifications" 
                  checked={emailNotifications} 
                  onCheckedChange={setEmailNotifications} 
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="sms-notifications">短信通知</Label>
                  <p className="text-sm text-muted-foreground">
                    通过短信接收平台重要通知
                  </p>
                </div>
                <Switch 
                  id="sms-notifications" 
                  checked={smsNotifications} 
                  onCheckedChange={setSmsNotifications} 
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="app-notifications">应用内通知</Label>
                  <p className="text-sm text-muted-foreground">
                    在平台内接收实时通知
                  </p>
                </div>
                <Switch 
                  id="app-notifications" 
                  checked={appNotifications} 
                  onCheckedChange={setAppNotifications} 
                />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>通知类型</CardTitle>
              <CardDescription>
                选择您希望接收的通知类型
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="task-notifications">任务通知</Label>
                  <p className="text-sm text-muted-foreground">
                    任务状态更新、新任务推荐等
                  </p>
                </div>
                <Switch 
                  id="task-notifications" 
                  checked={taskNotifications} 
                  onCheckedChange={setTaskNotifications} 
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="message-notifications">消息通知</Label>
                  <p className="text-sm text-muted-foreground">
                    私信、评论回复等
                  </p>
                </div>
                <Switch 
                  id="message-notifications" 
                  checked={messageNotifications} 
                  onCheckedChange={setMessageNotifications} 
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="payment-notifications">支付通知</Label>
                  <p className="text-sm text-muted-foreground">
                    收款、提现等财务相关通知
                  </p>
                </div>
                <Switch 
                  id="payment-notifications" 
                  checked={paymentNotifications} 
                  onCheckedChange={setPaymentNotifications} 
                />
              </div>
              <div className="pt-4 flex justify-end">
                <Button 
                  onClick={handleSaveNotifications}
                  disabled={isSavingNotifications}
                >
                  {isSavingNotifications ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      保存中...
                    </>
                  ) : "保存设置"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* 隐私设置 */}
        <TabsContent value="privacy" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>个人资料可见性</CardTitle>
              <CardDescription>
                管理您的资料对其他用户的可见性
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="profile-visibility">个人资料公开</Label>
                  <p className="text-sm text-muted-foreground">
                    允许其他用户查看您的个人资料
                  </p>
                </div>
                <Switch 
                  id="profile-visibility" 
                  checked={profileVisibility} 
                  onCheckedChange={setProfileVisibility} 
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="hourly-rate-visibility">显示时薪</Label>
                  <p className="text-sm text-muted-foreground">
                    在您的个人资料中显示期望时薪
                  </p>
                </div>
                <Switch 
                  id="hourly-rate-visibility" 
                  checked={showHourlyRate} 
                  onCheckedChange={setShowHourlyRate} 
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="contact-info-visibility">显示联系方式</Label>
                  <p className="text-sm text-muted-foreground">
                    在您的个人资料中显示联系方式
                  </p>
                </div>
                <Switch 
                  id="contact-info-visibility" 
                  checked={showContactInfo} 
                  onCheckedChange={setShowContactInfo} 
                />
              </div>
              <div className="pt-4 flex justify-end">
                <Button 
                  onClick={handleSavePrivacy}
                  disabled={isSavingPrivacy}
                >
                  {isSavingPrivacy ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      保存中...
                    </>
                  ) : "保存设置"}
                </Button>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>数据管理</CardTitle>
              <CardDescription>
                管理您的个人数据
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col space-y-2">
                <Button variant="outline">
                  导出我的数据
                </Button>
                <p className="text-xs text-muted-foreground">
                  下载您的个人资料、任务记录和其他平台数据的副本
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
} 