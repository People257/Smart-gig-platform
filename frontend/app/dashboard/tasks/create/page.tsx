"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Calendar, MapPin, Plus, X } from "lucide-react"
import { toast } from "sonner"
import { tasksApi } from "@/lib/api"
import { useAuth } from "@/lib/auth-context"

export default function CreateTaskPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  // 权限判断：仅雇主可访问
  if (!isLoading && user?.user_type !== "employer") {
    if (typeof window !== "undefined") {
      router.replace("/dashboard");
    }
    return <div className="text-center py-20 text-xl text-red-500">无权限访问</div>;
  }

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [locationType, setLocationType] = useState("online")
  const [location, setLocation] = useState("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [paymentType, setPaymentType] = useState("hourly")
  const [budget, setBudget] = useState("")
  const [headcount, setHeadcount] = useState("1")
  const [skillInput, setSkillInput] = useState("")
  const [skills, setSkills] = useState<string[]>([])
  const [isPublic, setIsPublic] = useState(true)
  const [isUrgent, setIsUrgent] = useState(false)
  const [agreed, setAgreed] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleAddSkill = () => {
    if (skillInput.trim() && !skills.includes(skillInput.trim())) {
      setSkills([...skills, skillInput.trim()])
      setSkillInput("")
    }
  }

  const handleRemoveSkill = (skill: string) => {
    setSkills(skills.filter((s) => s !== skill))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!title || !description || (locationType === "offline" && !location) || !startDate || !endDate || !budget) {
      toast.error("请填写所有必填字段")
      return
    }

    try {
      setIsSubmitting(true)
      
      const taskData = {
        title,
        description,
        location_type: locationType,
        location: locationType === 'offline' ? location : '线上远程',
        start_date: startDate,
        end_date: endDate,
        payment_type: paymentType,
        budget: Number(budget),
        headcount: Number(headcount),
        skills,
        is_public: isPublic,
        is_urgent: isUrgent,
      }
      
      const { success, data, error } = await tasksApi.createTask(taskData)
      
      if (success && data) {
        toast.success("任务发布成功")
        router.push("/dashboard/tasks")
      } else {
        throw new Error(error || "创建任务失败")
      }
    } catch (error: any) {
      console.error("任务发布失败:", error)
      toast.error(error.message || "发布失败，请稍后重试")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Link href="/dashboard/tasks">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">发布任务</h1>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>基本信息</CardTitle>
              <CardDescription>填写任务的基本信息</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">任务标题</Label>
                <Input
                  id="title"
                  placeholder="请输入任务标题"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">任务描述</Label>
                <Textarea
                  id="description"
                  placeholder="请详细描述任务内容、要求和职责"
                  className="min-h-[120px]"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>工作地点</Label>
                <RadioGroup value={locationType} onValueChange={setLocationType} className="flex space-x-4">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="online" id="online" />
                    <Label htmlFor="online">线上远程</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="offline" id="offline" />
                    <Label htmlFor="offline">线下地点</Label>
                  </div>
                </RadioGroup>
              </div>
              {locationType === "offline" && (
                <div className="space-y-2">
                  <Label htmlFor="location">具体地点</Label>
                  <div className="flex items-center space-x-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <Input
                      id="location"
                      placeholder="请输入具体工作地点"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      required
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>时间与薪酬</CardTitle>
              <CardDescription>设置任务的时间周期和薪酬预算</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start-date">开始日期</Label>
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <Input
                      id="start-date"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end-date">结束日期</Label>
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <Input
                      id="end-date"
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>薪酬类型</Label>
                <RadioGroup value={paymentType} onValueChange={setPaymentType} className="flex flex-wrap gap-4">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="hourly" id="hourly" />
                    <Label htmlFor="hourly">时薪</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="daily" id="daily" />
                    <Label htmlFor="daily">日薪</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="fixed" id="fixed" />
                    <Label htmlFor="fixed">项目总价</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label htmlFor="budget">预算金额</Label>
                <div className="flex items-center space-x-2">
                  <Input
                    id="budget"
                    type="number"
                    placeholder={
                      paymentType === "hourly"
                        ? "请输入时薪（元/小时）"
                        : paymentType === "daily"
                          ? "请输入日薪（元/天）"
                          : "请输入项目总价（元）"
                    }
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    required
                  />
                  <span className="text-sm text-muted-foreground whitespace-nowrap">
                    元{paymentType === "hourly" ? "/小时" : paymentType === "daily" ? "/天" : ""}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="headcount">招聘人数</Label>
                <Select value={headcount} onValueChange={setHeadcount}>
                  <SelectTrigger>
                    <SelectValue placeholder="请选择招聘人数" />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                      <SelectItem key={num} value={num.toString()}>
                        {num}人
                      </SelectItem>
                    ))}
                    <SelectItem value="10+">10人以上</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>技能要求</CardTitle>
              <CardDescription>添加任务所需的技能标签</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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

              {skills.length > 0 && (
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
              )}

              <div className="space-y-2 pt-2">
                <Label>推荐技能</Label>
                <div className="flex flex-wrap gap-2">
                  {["UI设计", "前端开发", "后端开发", "产品经理", "数据分析", "内容运营"].map((skill) => (
                    <Badge
                      key={skill}
                      variant="outline"
                      className="cursor-pointer hover:bg-secondary"
                      onClick={() => {
                        if (!skills.includes(skill)) {
                          setSkills([...skills, skill])
                        }
                      }}
                    >
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>发布设置</CardTitle>
              <CardDescription>设置任务的可见性和其他选项</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start space-x-2">
                <Checkbox id="public" checked={isPublic} onCheckedChange={(checked) => setIsPublic(checked === true)} />
                <div className="grid gap-1.5 leading-none">
                  <Label htmlFor="public">公开发布</Label>
                  <p className="text-sm text-muted-foreground">任务将在平台公开展示，所有用户可以查看和申请</p>
                </div>
              </div>
              <div className="flex items-start space-x-2">
                <Checkbox id="urgent" checked={isUrgent} onCheckedChange={(checked) => setIsUrgent(checked === true)} />
                <div className="grid gap-1.5 leading-none">
                  <Label htmlFor="urgent">紧急任务</Label>
                  <p className="text-sm text-muted-foreground">标记为紧急任务，将获得更高的曝光度</p>
                </div>
              </div>
              <div className="flex items-start space-x-2">
                <Checkbox
                  id="terms"
                  checked={agreed}
                  onCheckedChange={(checked) => setAgreed(checked === true)}
                  required
                />
                <div className="grid gap-1.5 leading-none">
                  <Label htmlFor="terms">
                    我已阅读并同意
                    <Link href="/terms" className="text-primary hover:underline ml-1">
                      服务条款
                    </Link>
                  </Label>
                  <p className="text-sm text-muted-foreground">您发布的任务内容必须符合平台规定和相关法律法规</p>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" type="button" onClick={() => router.back()} disabled={isSubmitting}>
                取消
              </Button>
              <Button type="submit" disabled={isSubmitting || !agreed}>
                {isSubmitting ? "发布中..." : "发布任务"}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </form>
    </div>
  )
}
