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

interface ProfileData {
  username?: string;
  name?: string;
  bio?: string;
  location?: string;
  hourly_rate?: number;
  skills?: string[];
  verified?: boolean;
  avatar?: string;
  [key: string]: any;
}

export default function ProfilePage() {
  const { user: authUser, updateUser } = useAuth()
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [profileData, setProfileData] = useState<ProfileData>({})

  // 表单状态
  const [name, setName] = useState("")
  const [bio, setBio] = useState("")
  const [location, setLocation] = useState("")
  const [hourlyRate, setHourlyRate] = useState("")
  const [skillInput, setSkillInput] = useState("")
  const [skills, setSkills] = useState<string[]>([])

  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        setIsLoading(true)
        const { success, data, error } = await userApi.getProfile()
        
        if (success && data?.user) {
          const userData = data.user
          setProfileData(userData)
          
          // 初始化表单状态
          setName(userData.name || '')
          setBio(userData.bio || '')
          setLocation(userData.location || '')
          setHourlyRate(userData.hourly_rate?.toString() || '')
          setSkills(userData.skills || [])
        } else {
          toast.error("获取用户资料失败: " + error)
        }
      } catch (error) {
        console.error('获取用户资料失败:', error)
        toast.error("获取资料失败，请稍后重试")
      } finally {
        setIsLoading(false)
      }
    }

    fetchProfileData()
  }, [])

  const handleAddSkill = () => {
    if (skillInput.trim() && !skills.includes(skillInput.trim())) {
      setSkills([...skills, skillInput.trim()])
      setSkillInput("")
    }
  }

  const handleRemoveSkill = (skill: string) => {
    setSkills(skills.filter((s) => s !== skill))
  }

  const handleSave = async () => {
    try {
      setIsSaving(true)
      
      const updatedProfile = {
        name,
        bio,
        location,
        hourly_rate: hourlyRate ? Number(hourlyRate) : undefined,
        skills,
      }
      
      const { success, data, error } = await userApi.updateProfile(updatedProfile)
      
      if (success && data?.user) {
        setProfileData(data.user)
        // 更新全局用户状态
        updateUser(data.user)
        toast.success("个人资料已更新")
        setIsEditing(false)
      } else {
        throw new Error(error || "保存资料失败")
      }
    } catch (error: any) {
      toast.error(error.message || "保存失败，请稍后重试")
    } finally {
      setIsSaving(false)
    }
  }

  const handleUploadAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0) {
      return
    }
    
    try {
      const file = event.target.files[0]
      const formData = new FormData()
      formData.append('avatar', file)
      
      const { success, data, error } = await userApi.uploadAvatar(formData)
      
      if (success && data?.avatarUrl) {
        // 更新个人资料中的头像
        setProfileData({...profileData, avatar: data.avatarUrl})
        // 更新全局用户状态
        updateUser({avatar: data.avatarUrl})
        toast.success("头像已更新")
      } else {
        throw new Error(error || "上传头像失败")
      }
    } catch (error: any) {
      toast.error(error.message || "上传失败，请稍后重试")
    }
  }

  const handleVerifyIdentity = () => {
    // 这里实现实名认证功能
    toast({
      title: "功能开发中",
      description: "实名认证功能即将上线",
    })
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
                  <div className="relative">
                    <Avatar className="h-24 w-24">
                      <AvatarImage src={profileData.avatar || "/placeholder.svg?height=96&width=96"} alt="头像" />
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
                  <div className="space-y-4 flex-1">
                    <div className="space-y-2">
                      <Label htmlFor="name">姓名</Label>
                      {isEditing ? (
                        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
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
                      {skills.length > 0 ? (
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

        <Card>
          <CardHeader>
            <CardTitle>实名认证</CardTitle>
            <CardDescription>完成实名认证以获得更多任务机会</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-4 w-48" />
                  </div>
                  <Skeleton className="h-6 w-16" />
                </div>
                <Skeleton className="h-10 w-32" />
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="font-medium">身份认证</p>
                    <p className="text-sm text-muted-foreground">上传您的身份证正反面照片进行认证</p>
                  </div>
                  <Badge 
                    variant="outline" 
                    className={profileData.verified ? 
                      "bg-green-100 text-green-800 hover:bg-green-100" : 
                      "bg-yellow-100 text-yellow-800 hover:bg-yellow-100"}
                  >
                    {profileData.verified ? "已认证" : "待认证"}
                  </Badge>
                </div>
                {!profileData.verified && (
                  <Button className="mt-4" onClick={handleVerifyIdentity}>
                    <Upload className="mr-2 h-4 w-4" />
                    上传证件
                  </Button>
                )}
              </>
            )}
          </CardContent>
        </Card>

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
                {profileData.portfolios && profileData.portfolios.length > 0 ? (
                  // 显示作品
                  profileData.portfolios.map((portfolio, index) => (
                    <div key={index} className="border rounded-lg p-2 aspect-square overflow-hidden">
                      <img 
                        src={portfolio.image} 
                        alt={portfolio.title} 
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))
                ) : (
                  // 添加作品按钮
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

        <Card>
          <CardHeader>
            <CardTitle>评价与评分</CardTitle>
            <CardDescription>您收到的评价将显示在这里</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-6">
                <div className="flex items-center gap-4 mb-6">
                  <div className="flex flex-col items-center">
                    <Skeleton className="h-8 w-16" />
                    <Skeleton className="h-4 w-24 mt-2" />
                    <Skeleton className="h-4 w-16 mt-1" />
                  </div>
                  <div className="flex-1 space-y-2">
                    {Array(5)
                      .fill(0)
                      .map((_, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <Skeleton className="h-4 w-8" />
                          <Skeleton className="h-2 flex-1" />
                          <Skeleton className="h-4 w-8" />
                        </div>
                      ))}
                  </div>
                </div>
                <Tabs defaultValue="all">
                  <TabsList>
                    <TabsTrigger value="all">全部评价</TabsTrigger>
                    <TabsTrigger value="positive">好评</TabsTrigger>
                    <TabsTrigger value="negative">差评</TabsTrigger>
                  </TabsList>
                  <TabsContent value="all" className="space-y-4 mt-4">
                    {Array(2)
                      .fill(0)
                      .map((_, i) => (
                        <div key={i} className="border rounded-lg p-4">
                          <div className="flex justify-between items-start">
                            <div className="flex items-center gap-2">
                              <Skeleton className="h-8 w-8 rounded-full" />
                              <div>
                                <Skeleton className="h-4 w-16" />
                                <Skeleton className="h-3 w-24 mt-1" />
                              </div>
                            </div>
                            <Skeleton className="h-4 w-24" />
                          </div>
                          <Skeleton className="h-4 w-full mt-2" />
                        </div>
                      ))}
                  </TabsContent>
                </Tabs>
              </div>
            ) : profileData.reviews && profileData.reviews.length > 0 ? (
              <div>
                {/* 评分统计 */}
                <div className="flex items-center gap-4 mb-6">
                  {/* 平均分 */}
                  <div className="flex flex-col items-center">
                    <div className="text-3xl font-bold">{profileData.rating || "0"}</div>
                    <div className="flex items-center text-yellow-500">
                      {Array(5).fill(0).map((_, i) => (
                        <Star key={i} 
                          className={`h-4 w-4 ${i < Math.round(profileData.rating || 0) ? 'fill-current' : ''}`} 
                        />
                      ))}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{profileData.reviews.length} 条评价</p>
                  </div>
                  
                  {/* 评分分布 */}
                  <div className="flex-1 space-y-2">
                    {[5, 4, 3, 2, 1].map(stars => {
                      const count = profileData.reviews.filter(r => r.rating === stars).length;
                      const percentage = profileData.reviews.length ? Math.round(count / profileData.reviews.length * 100) : 0;
                      
                      return (
                        <div key={stars} className="flex items-center gap-2">
                          <span className="text-sm w-8">{stars}星</span>
                          <div className="h-2 bg-muted rounded-full overflow-hidden flex-1">
                            <div 
                              className="bg-yellow-500 h-full" 
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <span className="text-sm w-8">{percentage}%</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                
                {/* 评价列表 */}
                <Tabs defaultValue="all">
                  <TabsList>
                    <TabsTrigger value="all">全部评价</TabsTrigger>
                    <TabsTrigger value="positive">好评</TabsTrigger>
                    <TabsTrigger value="negative">差评</TabsTrigger>
                  </TabsList>
                  <TabsContent value="all" className="space-y-4 mt-4">
                    {profileData.reviews.map(review => (
                      <div key={review.id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={review.reviewer.avatar || "/placeholder.svg"} />
                              <AvatarFallback>{review.reviewer.name?.charAt(0) || "?"}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{review.reviewer.name}</p>
                              <p className="text-xs text-muted-foreground">{review.created_at}</p>
                            </div>
                          </div>
                          <div className="flex items-center text-yellow-500">
                            {Array(5).fill(0).map((_, i) => (
                              <Star key={i} 
                                className={`h-3 w-3 ${i < review.rating ? 'fill-current' : ''}`} 
                              />
                            ))}
                          </div>
                        </div>
                        <p className="mt-2 text-sm">{review.content}</p>
                      </div>
                    ))}
                  </TabsContent>
                  <TabsContent value="positive" className="space-y-4 mt-4">
                    {profileData.reviews
                      .filter(review => review.rating >= 4)
                      .map(review => (
                        <div key={review.id} className="border rounded-lg p-4">
                          <div className="flex justify-between items-start">
                            <div className="flex items-center gap-2">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={review.reviewer.avatar || "/placeholder.svg"} />
                                <AvatarFallback>{review.reviewer.name?.charAt(0) || "?"}</AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">{review.reviewer.name}</p>
                                <p className="text-xs text-muted-foreground">{review.created_at}</p>
                              </div>
                            </div>
                            <div className="flex items-center text-yellow-500">
                              {Array(5).fill(0).map((_, i) => (
                                <Star key={i} 
                                  className={`h-3 w-3 ${i < review.rating ? 'fill-current' : ''}`} 
                                />
                              ))}
                            </div>
                          </div>
                          <p className="mt-2 text-sm">{review.content}</p>
                        </div>
                      ))}
                  </TabsContent>
                  <TabsContent value="negative" className="space-y-4 mt-4">
                    {profileData.reviews
                      .filter(review => review.rating < 4)
                      .map(review => (
                        <div key={review.id} className="border rounded-lg p-4">
                          <div className="flex justify-between items-start">
                            <div className="flex items-center gap-2">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={review.reviewer.avatar || "/placeholder.svg"} />
                                <AvatarFallback>{review.reviewer.name?.charAt(0) || "?"}</AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">{review.reviewer.name}</p>
                                <p className="text-xs text-muted-foreground">{review.created_at}</p>
                              </div>
                            </div>
                            <div className="flex items-center text-yellow-500">
                              {Array(5).fill(0).map((_, i) => (
                                <Star key={i} 
                                  className={`h-3 w-3 ${i < review.rating ? 'fill-current' : ''}`} 
                                />
                              ))}
                            </div>
                          </div>
                          <p className="mt-2 text-sm">{review.content}</p>
                        </div>
                      ))}
                  </TabsContent>
                </Tabs>
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
      </div>
    </div>
  )
}
