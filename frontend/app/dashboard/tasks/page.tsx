"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Calendar, Clock, Filter, MapPin, Plus, Search, Users } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { tasksApi } from "@/lib/api"
import { toast } from "sonner"
import { useAuth } from "@/lib/auth-context"

// Define Task interface
interface Task {
  id?: string;
  uuid?: string;
  title: string;
  description: string;
  status: string;
  skills?: string[];
  location?: string;
  start_date?: string;
  startDate?: string;
  end_date?: string;
  endDate?: string;
  applicants_count?: number;
  applicants?: number;
  hourly_rate?: number;
  hourlyRate?: number;
  is_creator?: boolean;
  is_applicant?: boolean;
  employer?: { name: string };
  budget_display?: string;
  created_at?: string;
}

export default function TasksPage() {
  const { user } = useAuth()
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [isLoading, setIsLoading] = useState(true)
  const [tasks, setTasks] = useState<Task[]>([])
  const [activeTab, setActiveTab] = useState("all")

  useEffect(() => {
    fetchTasks()
  }, [activeTab, statusFilter])

  const fetchTasks = async () => {
    try {
      setIsLoading(true)
      
      // Build query parameters based on filters
      const params: Record<string, string> = {}
      
      if (statusFilter !== "all") {
        params.status = statusFilter
      }
      
      if (activeTab === "my" && user) {
        params.user_id = user.uuid
      } else if (activeTab === "favorite" && user) {
        params.favorite = "true"
      }
      
      const { success, data, error } = await tasksApi.getTasks(params)
      
      if (success && data) {
        setTasks(data.tasks || [])
      } else {
        toast.error("获取任务列表失败: " + error)
        setTasks([])
      }
    } catch (error) {
      console.error("获取任务列表失败:", error)
      toast.error("获取任务列表失败，请稍后重试")
      setTasks([])
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "recruiting":
        return <Badge className="bg-blue-500">招聘中</Badge>
      case "in_progress":
        return <Badge className="bg-green-500">进行中</Badge>
      case "completed":
        return <Badge className="bg-purple-500">已完成</Badge>
      case "closed":
        return <Badge variant="outline">已关闭</Badge>
      default:
        return null
    }
  }

  const filteredTasks = tasks.filter((task) => {
    // 只对搜索查询进行客户端筛选
    if (searchQuery === "") return true;
    
    return (
      task.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.skills?.some(skill => skill.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  })

  // 添加调试代码
  useEffect(() => {
    console.log("Status filter:", statusFilter);
    console.log("Raw tasks from API:", tasks);
    console.log("Filtered tasks:", filteredTasks);
  }, [statusFilter, tasks, filteredTasks]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">任务管理</h1>
        {user?.user_type === "employer" && (
        <Link href="/dashboard/tasks/create">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">发布任务</span>
            <span className="sm:hidden">发布</span>
          </Button>
        </Link>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="all" className="flex-1 sm:flex-none">
              全部任务
            </TabsTrigger>
            <TabsTrigger value="my" className="flex-1 sm:flex-none">
              我的任务
            </TabsTrigger>
            <TabsTrigger value="favorite" className="flex-1 sm:flex-none">
              收藏任务
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="搜索任务..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button variant="outline" size="icon">
              <Filter className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-4 mb-6">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="任务状态" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部状态</SelectItem>
              <SelectItem value="recruiting">招聘中</SelectItem>
              <SelectItem value="in_progress">进行中</SelectItem>
              <SelectItem value="completed">已完成</SelectItem>
              <SelectItem value="closed">已关闭</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <TabsContent value="all" className="space-y-4">
          {renderTaskList()}
        </TabsContent>
        <TabsContent value="my" className="space-y-4">
          {renderTaskList()}
        </TabsContent>
        <TabsContent value="favorite" className="space-y-4">
          {renderTaskList()}
        </TabsContent>
      </Tabs>
    </div>
  )

  function renderTaskList() {
    if (isLoading) {
      return Array(3)
        .fill(0)
        .map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-6 w-16" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                <Skeleton className="h-4 w-full" />
                <div className="flex flex-wrap gap-2">
                  {Array(3)
                    .fill(0)
                    .map((_, j) => (
                      <Skeleton key={j} className="h-6 w-16" />
                    ))}
                </div>
                <div className="flex flex-wrap gap-x-6 gap-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-16" />
                </div>
                <div className="flex justify-end gap-2">
                  <Skeleton className="h-9 w-20" />
                  <Skeleton className="h-9 w-20" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))
    }
    
    if (filteredTasks.length === 0) {
      return (
        <div className="text-center py-10">
          <p className="text-muted-foreground">暂无任务数据</p>
        </div>
      )
    }
    
    return filteredTasks.map((task) => (
      <Card key={task.id || task.uuid}>
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start">
            <CardTitle className="text-lg">{task.title}</CardTitle>
            {getStatusBadge(task.status)}
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2 mt-2 text-sm text-muted-foreground">
            <div className="flex items-center">
              <span className="font-medium">雇主：</span>
              <span>{task.employer?.name || '未知'}</span>
            </div>
            <div className="flex items-center">
              <span className="font-medium">预算：</span>
              <span>{task.budget_display || '未设置'}</span>
            </div>
            <div className="flex items-center">
              <span className="font-medium">创建时间：</span>
              <span>{task.created_at ? (typeof task.created_at === 'string' ? task.created_at.split('T')[0] : task.created_at) : '未知'}</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <p className="text-sm text-muted-foreground line-clamp-2">{task.description}</p>
            <div className="flex flex-wrap gap-2">
              {(task.skills || []).map((skill, index) => (
                <Badge key={index} variant="secondary">
                  {skill}
                </Badge>
              ))}
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
              <div className="flex items-center">
                <MapPin className="mr-1 h-3.5 w-3.5" />
                <span>{task.location || "线上"}</span>
              </div>
              <div className="flex items-center">
                <Calendar className="mr-1 h-3.5 w-3.5" />
                <span>
                  {task.start_date || task.startDate || "未设置"} 至 {task.end_date || task.endDate || "未设置"}
                </span>
              </div>
              <div className="flex items-center">
                <Users className="mr-1 h-3.5 w-3.5" />
                <span>{task.applicants_count || task.applicants || 0}人申请</span>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Link href={`/dashboard/tasks/${task.uuid}`}>
                <Button variant="outline">查看详情</Button>
              </Link>
              {task.status === "recruiting" && !task.is_creator && !task.is_applicant && (
                <Button onClick={() => handleApplyTask(task.id || task.uuid)}>申请任务</Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    ))
  }
  
  async function handleApplyTask(taskId: string | undefined) {
    if (!taskId) {
      toast.error("任务ID无效，无法申请");
      return;
    }
    
    try {
      const { success, message, error } = await tasksApi.applyToTask(taskId, {});
      
      if (success) {
        toast.success(message || "申请成功，请等待雇主审核");
        fetchTasks(); // 刷新任务列表
      } else {
        toast.error(error || "申请失败，请稍后重试");
      }
    } catch (error) {
      console.error("申请任务失败:", error);
      toast.error("申请失败，请稍后重试");
    }
  }
}
