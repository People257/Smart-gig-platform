"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Camera, Check, Edit, MapPin, Plus, Star, Upload, X } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { useAuth } from "@/lib/auth-context"
import { userApi } from "@/lib/api"

// 技能对象类型定义
interface Skill {
  id?: number;
  name: string;
  created_at?: string;
}

// 个人资料类型定义
interface ProfileData {
  username?: string;
  name?: string;
  bio?: string;
  location?: string;
  hourly_rate?: number;
  skills?: Skill[] | string[];
  verified?: boolean;
  is_identity_verified?: boolean;
  avatar?: string;
  avatar_url?: string;
  uuid?: string;
  phone_number?: string;
  email?: string;
  created_at?: string;
  user_type?: string;
  [key: string]: any;
}

export default function ProfilePage() {
  // 使用认证上下文
  const { user: authUser, updateUser } = useAuth()
  
  // 状态管理
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [profileData, setProfileData] = useState<ProfileData>({})
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)

  // 表单状态
  const [name, setName] = useState("")
  const [bio, setBio] = useState("")
  const [location, setLocation] = useState("")
  const [hourlyRate, setHourlyRate] = useState("")
  const [skillInput, setSkillInput] = useState("")
  const [skills, setSkills] = useState<string[]>([])

  // 新增实名认证表单相关状态
  const [realName, setRealName] = useState("");
  const [idCard, setIdCard] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [identityInfo, setIdentityInfo] = useState<{real_name?: string, id_card?: string, is_identity_verified?: boolean} | null>(null);

  // 获取用户资料
  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        setIsLoading(true)
        setError(null)
        console.log("获取用户资料...")
        
        const response = await userApi.getProfile()
        console.log("API返回的完整响应:", response)
        
        if (response.success && response.data) {
          // Check if we have actual user data in response
          const userData = response.data.user || response.data
          
          // Validate we have something to work with
          if (!userData || (typeof userData === 'object' && Object.keys(userData).length === 0)) {
            console.error("获取用户资料失败: 服务器返回空数据")
            setError("获取用户资料失败: 服务器返回空数据")
            toast.error("获取用户资料失败: 服务器返回空数据")
            setProfileData({})
            return
          }
          
          console.log("获取到的用户数据:", userData)
          
          try {
            // 将用户数据规范化，处理字段命名不一致的问题
            const normalizedData: ProfileData = {
              ...userData,
              // 处理头像字段
              avatar: userData.avatar_url || userData.avatar,
              // 确保verified字段一致
              verified: userData.is_identity_verified || userData.verified || false,
              // 确保有名称字段
              name: userData.name || userData.full_name || userData.username,
            }
            
            console.log("规范化后的用户数据:", normalizedData)
            setProfileData(normalizedData)
            
            // 设置表单状态
            setName(normalizedData.name || '')
            setBio(normalizedData.bio || '')
            setLocation(normalizedData.location || '')
            setHourlyRate(
              typeof normalizedData.hourly_rate === 'number' 
                ? normalizedData.hourly_rate.toString() 
                : ''
            )
            
            // 处理技能数据 - 可能是对象数组或字符串数组
            if (normalizedData.skills) {
              console.log("处理技能数据:", normalizedData.skills)
              
              if (Array.isArray(normalizedData.skills)) {
                // 技能可能是对象数组或字符串数组
                const processedSkills = normalizedData.skills.map(skill => {
                  if (typeof skill === 'string') {
                    return skill
                  } else if (typeof skill === 'object' && skill !== null) {
                    return skill.name || ''
                  }
                  return ''
                }).filter(Boolean)
                
                console.log("处理后的技能列表:", processedSkills)
                setSkills(processedSkills)
              } else {
                setSkills([])
              }
            } else {
              setSkills([])
            }
          } catch (parseError) {
            console.error("解析用户数据出错:", parseError)
            setError("数据解析错误")
            toast.error("处理用户数据时出错")
            
            // 设置空数据，确保UI不会崩溃
            setProfileData({})
          }
        } else {
          console.error("获取用户资料失败:", response.error || response.message || "无响应数据")
          const errorMessage = response.error || response.message || "获取用户资料失败，请刷新重试"
          setError(errorMessage)
          toast.error(errorMessage)
          setProfileData({})
        }
      } catch (error: any) {
        console.error("获取用户资料异常:", error)
        const errorMessage = error.message || "网络错误，请检查连接后重试"
        setError(errorMessage)
        toast.error(errorMessage)
        setProfileData({})
      } finally {
        setIsLoading(false)
      }
    }

    fetchProfileData()
  }, [retryCount])

  // 重试加载用户资料
  const handleRetry = () => {
    setRetryCount(prev => prev + 1)
    setError(null)
    setIsLoading(true)
  }

  // 添加技能
  const handleAddSkill = () => {
    if (skillInput.trim() && !skills.includes(skillInput.trim())) {
      setSkills([...skills, skillInput.trim()])
      setSkillInput("")
    }
  }

  // 移除技能
  const handleRemoveSkill = (skill: string) => {
    setSkills(skills.filter((s) => s !== skill))
  }

  // 保存个人资料
  const handleSave = async () => {
    try {
      setIsSaving(true)
      console.log("准备保存用户资料...")
      
      // 根据后端接收的格式准备技能数据
      // 如果后端期望的是对象数组格式 [{name: "技能名"}]
      const formattedSkills = skills.map(skill => ({ name: skill }))
      
      const updatedProfile = {
        name,
        bio,
        location,
        hourly_rate: hourlyRate ? parseFloat(hourlyRate) : undefined,
        skills: formattedSkills
      }
      
      console.log("提交的个人资料数据:", updatedProfile)
      const response = await userApi.updateProfile(updatedProfile)
      
      if (response.success && response.data?.user) {
        console.log("更新成功，返回的用户数据:", response.data.user)
        
        // 更新本地状态和全局用户状态
        const userData = response.data.user
        setProfileData({
          ...profileData,
          ...userData,
          // 确保头像字段一致
          avatar: userData.avatar_url || userData.avatar || profileData.avatar,
          // 技能已格式化，无需重新处理
        })
        
        // 更新全局用户状态
        updateUser(userData)
        
        toast.success("个人资料已更新")
        setIsEditing(false)
      } else {
        console.error("保存资料失败:", response.error)
        toast.error(response.error || "保存资料失败")
      }
    } catch (error: any) {
      console.error("保存资料异常:", error)
      toast.error(error.message || "保存失败，请稍后重试")
    } finally {
      setIsSaving(false)
    }
  }

  // 上传头像
  const handleUploadAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0) {
      return
    }
    
    try {
      const file = event.target.files[0]
      const formData = new FormData()
      formData.append('avatar', file)
      
      const response = await userApi.uploadAvatar(formData)
      
      if (response.success && response.data) {
        // 处理各种可能的返回字段名
        const avatarUrl = response.data.avatarUrl || response.data.avatar_url || response.data.avatar
        
        if (!avatarUrl) {
          throw new Error("服务器返回的数据中没有有效的头像URL")
        }
        
        // 更新本地状态
        setProfileData({
          ...profileData,
          avatar: avatarUrl,
          avatar_url: avatarUrl
        })
        
        // 更新全局用户状态
        updateUser({
          avatar: avatarUrl,
          avatar_url: avatarUrl
        })
        
        toast.success("头像已更新")
      } else {
        throw new Error(response.error || "上传头像失败")
      }
    } catch (error: any) {
      console.error("上传头像失败:", error)
      toast.error(error.message || "上传失败，请稍后重试")
    }
  }

  // 身份认证处理
  const handleVerifyIdentity = () => {
    toast({
      title: "功能开发中",
      description: "实名认证功能即将上线",
    })
  }

  // 新增实名认证提交函数
  const handleRealNameAuth = async () => {
    if (!realName || !idCard) {
      toast.error("请填写姓名和身份证号");
      return;
    }
    setIsVerifying(true);
    try {
      const response = await userApi.realNameAuth({ real_name: realName, id_card: idCard });
      if (response.success) {
        toast.success("实名认证成功");
        setIdentityInfo(response.data);
        // 触发资料刷新
        setRetryCount(prev => prev + 1);
      } else {
        toast.error(response.error || "实名认证失败");
      }
    } catch (e: any) {
      toast.error(e.message || "实名认证失败");
    } finally {
      setIsVerifying(false);
    }
  };

  // 如果出现错误，显示错误提示
  if (error && !isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">个人资料</h1>
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="rounded-full bg-red-100 p-3 mb-4">
                <X className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg font-medium">加载资料失败</h3>
              <p className="text-sm text-muted-foreground mt-1 mb-4">{error}</p>
              <Button onClick={() => window.location.reload()}>
                刷新页面
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">个人资料</h1>
        {!isLoading &&
          (!isEditing ? (
            <Button onClick={() => setIsEditing(true)}>
              <Edit className="mr-2 h-4 w-4" />
              编辑资料
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsEditing(false)} disabled={isSaving}>
                取消
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? (
                  "保存中..."
                ) : (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    保存
                  </>
                )}
              </Button>
            </div>
          ))}
      </div>

      <div className="grid gap-6">
        {/* 基本信息卡片 */}
        <Card>
          <CardHeader>
            <CardTitle>基本信息</CardTitle>
            <CardDescription>管理您的个人基本信息</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {isLoading ? (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row gap-6 items-start">
                  <Skeleton className="h-24 w-24 rounded-full" />
                  <div className="space-y-4 flex-1">
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-24 w-full" />
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <div className="flex flex-wrap gap-2">
                    {Array(4)
                      .fill(0)
                      .map((_, i) => (
                        <Skeleton key={i} className="h-8 w-16" />
                      ))}
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="flex flex-col sm:flex-row gap-6 items-start">
                  {/* 头像区域 */}
                  <div className="relative">
                    <Avatar className="h-24 w-24">
                      <AvatarImage src={profileData.avatar || profileData.avatar_url || "/placeholder.svg?height=96&width=96"} alt="头像" />
                      <AvatarFallback>{name?.charAt(0) || profileData.username?.charAt(0) || "用户"}</AvatarFallback>
                    </Avatar>
                    {isEditing && (
                      <>
                        <input 
                          type="file" 
                          id="avatar-upload" 
                          className="hidden" 
                          accept="image/*"
                          onChange={handleUploadAvatar}
                        />
                        <label htmlFor="avatar-upload">
                          <Button
                            size="icon"
                            variant="secondary"
                            className="absolute bottom-0 right-0 rounded-full cursor-pointer"
                          >
                            <Camera className="h-4 w-4" />
                          </Button>
                        </label>
                      </>
                    )}
                  </div>
                  
                  {/* 姓名和简介 */}
                  <div className="space-y-4 flex-1">
                    <div className="space-y-2">
                      <Label htmlFor="name">姓名</Label>
                      {isEditing ? (
                        <Input 
                          id="name" 
                          value={name} 
                          onChange={(e) => setName(e.target.value)} 
                          placeholder="请输入您的姓名"
                        />
                      ) : (
                        <div className="text-lg font-medium">{name || profileData.name || "未设置"}</div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bio">个人简介</Label>
                      {isEditing ? (
                        <Textarea
                          id="bio"
                          value={bio}
                          onChange={(e) => setBio(e.target.value)}
                          className="min-h-[100px]"
                          placeholder="请简要介绍自己，包括专业技能、工作经验等"
                        />
                      ) : (
                        <p className="text-muted-foreground">{bio || profileData.bio || "暂无简介"}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* 位置和时薪 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="location">所在地区</Label>
                    {isEditing ? (
                      <div className="flex items-center space-x-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <Input
                          id="location"
                          value={location}
                          onChange={(e) => setLocation(e.target.value)}
                          placeholder="例如：北京市朝阳区"
                        />
                      </div>
                    ) : (
                      <div className="flex items-center text-muted-foreground">
                        <MapPin className="mr-2 h-4 w-4" />
                        {location || profileData.location || "未设置"}
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hourly-rate">期望时薪</Label>
                    {isEditing ? (
                      <div className="flex items-center space-x-2">
                        <Input
                          id="hourly-rate"
                          type="number"
                          value={hourlyRate}
                          onChange={(e) => setHourlyRate(e.target.value)}
                          placeholder="请输入期望时薪"
                        />
                        <span className="text-muted-foreground whitespace-nowrap">元/小时</span>
                      </div>
                    ) : (
                      <div className="text-muted-foreground">
                        {hourlyRate || profileData.hourly_rate ? 
                          `${hourlyRate || profileData.hourly_rate} 元/小时` : 
                          "未设置"}
                      </div>
                    )}
                  </div>
                </div>

                {/* 技能标签 */}
                <div className="space-y-2">
                  <Label>技能标签</Label>
                  {isEditing ? (
                    <>
                      <div className="flex items-center space-x-2">
                        <Input
                          placeholder="添加技能标签"
                          value={skillInput}
                          onChange={(e) => setSkillInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault()
                              handleAddSkill()
                            }
                          }}
                        />
                        <Button type="button" onClick={handleAddSkill} size="sm">
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {skills.map((skill, index) => (
                          <Badge key={index} variant="secondary" className="flex items-center gap-1">
                            {skill}
                            <button
                              type="button"
                              onClick={() => handleRemoveSkill(skill)}
                              className="rounded-full hover:bg-muted"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {skills && skills.length > 0 ? (
                        skills.map((skill, index) => (
                          <Badge key={index} variant="secondary">
                            {skill}
                          </Badge>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">暂无技能标签</p>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* 实名认证卡片 */}
        <Card>
          <CardHeader>
            <CardTitle>实名认证</CardTitle>
            <CardDescription>完成实名认证后可获得更多平台权益</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {profileData.is_identity_verified || identityInfo?.is_identity_verified ? (
              <div>
                <div className="mb-2">姓名：<span className="font-semibold">{identityInfo?.real_name || profileData.real_name || "已认证"}</span></div>
                <div className="mb-2">身份证号：<span className="font-semibold">{identityInfo?.id_card || profileData.id_card || "已认证"}</span></div>
                <Badge className="bg-green-500">已认证</Badge>
              </div>
            ) : (
              <div className="flex flex-col gap-4 max-w-md">
                <div>
                  <Label htmlFor="realname">真实姓名</Label>
                  <Input id="realname" value={realName} onChange={e => setRealName(e.target.value)} placeholder="请输入真实姓名" />
                </div>
                <div>
                  <Label htmlFor="idcard">身份证号</Label>
                  <Input id="idcard" value={idCard} onChange={e => setIdCard(e.target.value)} placeholder="请输入身份证号" maxLength={18} />
                </div>
                <Button onClick={handleRealNameAuth} disabled={isVerifying}>
                  {isVerifying ? "认证中..." : "提交认证"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 作品集卡片 */}
        <Card>
          <CardHeader>
            <CardTitle>作品集</CardTitle>
            <CardDescription>展示您的代表作品，提高接单机会</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Array(3)
                  .fill(0)
                  .map((_, i) => (
                    <Skeleton key={i} className="aspect-square" />
                  ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {profileData.portfolios && Array.isArray(profileData.portfolios) && profileData.portfolios.length > 0 ? (
                  // 有作品时显示作品
                  profileData.portfolios.map((portfolio, index) => (
                    <div key={index} className="border rounded-lg p-2 aspect-square overflow-hidden">
                      <img 
                        src={portfolio.image || "/placeholder.svg"} 
                        alt={portfolio.title || "作品"} 
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))
                ) : (
                  // 没有作品时显示添加按钮
                  <div className="border rounded-lg p-2 aspect-square flex items-center justify-center bg-muted">
                    <Button variant="ghost" className="h-full w-full flex flex-col gap-2">
                      <Plus className="h-6 w-6" />
                      <span>添加作品</span>
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 评价卡片 */}
        <Card>
          <CardHeader>
            <CardTitle>评价与评分</CardTitle>
            <CardDescription>您收到的评价将显示在这里</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="rounded-full bg-muted p-3 mb-4">
                  <Star className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium">暂无评价</h3>
                <p className="text-sm text-muted-foreground mt-1">完成任务后，您将收到雇主的评价</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 如果加载错误，显示重试按钮 */}
        {error && (
          <div className="flex flex-col items-center justify-center p-6 text-center space-y-4">
            <div className="text-destructive font-medium">{error}</div>
            <Button 
              variant="outline" 
              onClick={handleRetry}
              disabled={isLoading}
            >
              {isLoading ? "加载中..." : "重试加载"}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
