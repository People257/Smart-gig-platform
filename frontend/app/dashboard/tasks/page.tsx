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
import { tasksApi, userApi } from "@/lib/api"
import { toast } from "sonner"
import { useAuth } from "@/lib/auth-context"

// Define Task interface
interface Task {
  id?: string;
  uuid?: string;
  title?: string;
  description?: string;
  status?: string;
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
  application_status?: string;
  application_uuid?: string;
}

// Define TaskApplication interface
interface TaskApplication {
  application_id?: number;
  application_uuid?: string;
  status?: string;
  applied_at?: string;
  cover_letter?: string;
  task?: Task;
}

export default function TasksPage() {
  const { user } = useAuth()
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [isLoading, setIsLoading] = useState(true)
  const [tasks, setTasks] = useState<Task[]>([])
  const [activeTab, setActiveTab] = useState("all")
  const [myTaskApplications, setMyTaskApplications] = useState<TaskApplication[]>([])
  const [isMobile, setIsMobile] = useState(false)

  // Check for mobile view
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 640)
    }
    
    // Initial check
    checkIfMobile()
    
    // Listen for resize events
    window.addEventListener('resize', checkIfMobile)
    
    // Cleanup
    return () => window.removeEventListener('resize', checkIfMobile)
  }, [])

  useEffect(() => {
    fetchTasks()
  }, [activeTab, statusFilter])

  const fetchTasks = async () => {
    try {
      setIsLoading(true)
      
      if (activeTab === "my" && user) {
        // 获取"我的任务"（我申请的任务）
        const { success, data, error } = await userApi.getMyTasks()
        if (success && data && data.applications) {
          setMyTaskApplications(data.applications)
          // 从应用中提取任务信息
          const myTasks = data.applications
            .filter((app: TaskApplication) => statusFilter === "all" || app.task?.status === statusFilter)
            .map((app: TaskApplication) => ({
              ...app.task,
              application_status: app.status,
              application_uuid: app.application_uuid
            }))
          setTasks(myTasks)
        } else {
          toast.error("获取我的任务失败: " + error)
          setTasks([])
        }
      } else {
        // 获取普通任务列表（所有任务或收藏任务）
        // Build query parameters based on filters
        const params: Record<string, string> = {}
        
        if (statusFilter !== "all") {
          params.status = statusFilter
        }
        
        if (activeTab === "favorite" && user) {
          params.favorite = "true"
        }
        
        const { success, data, error } = await tasksApi.getTasks(params)
        
        if (success && data) {
          setTasks(data.tasks || [])
        } else {
          toast.error("获取任务列表失败: " + error)
          setTasks([])
        }
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
        <h1 className="text-xl md:text-2xl font-bold tracking-tight">任务管理</h1>
        {user?.user_type === "employer" && (
        <Link href="/dashboard/tasks/create">
          <Button size={isMobile ? "sm" : "default"}>
            <Plus className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">发布任务</span>
            <span className="sm:hidden">发布</span>
          </Button>
        </Link>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex flex-col space-y-4 sm:space-y-0 sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
          <TabsList className="w-full sm:w-auto grid grid-cols-3 h-auto">
            <TabsTrigger value="all" className="px-3 py-1.5">
              全部任务
            </TabsTrigger>
            <TabsTrigger value="my" className="px-3 py-1.5">
              我的任务
            </TabsTrigger>
            <TabsTrigger value="favorite" className="px-3 py-1.5">
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
            <Button variant="outline" size="icon" className="shrink-0">
              <Filter className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-4 mb-6">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className={isMobile ? "w-full" : "w-[180px]"}>
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

        <TabsContent value="all" className="space-y-4 mt-0">
          {renderTaskList()}
        </TabsContent>
        <TabsContent value="my" className="space-y-4 mt-0">
          {renderTaskList()}
        </TabsContent>
        <TabsContent value="favorite" className="space-y-4 mt-0">
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
                </div>
              </div>
            </CardContent>
          </Card>
        ))
    }
    
    if (filteredTasks.length === 0) {
      return (
        <div className="text-center py-12">
          <p className="text-muted-foreground">没有找到匹配的任务</p>
        </div>
      )
    }
    
    return filteredTasks.map((task) => (
      <Card key={task.uuid || task.id}>
        <CardHeader className="pb-2">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
            <CardTitle className="text-lg sm:text-xl text-ellipsis line-clamp-1 break-all">
              <Link href={`/dashboard/tasks/${task.uuid}`}>{task.title}</Link>
            </CardTitle>
            <div className="flex flex-wrap gap-2">
              {getStatusBadge(task.status || "")}
              {task.application_status && (
                <Badge variant="outline" className="ml-2">申请状态: {task.application_status}</Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <p className="text-sm text-muted-foreground line-clamp-2">{task.description}</p>
            <div className="flex flex-wrap gap-2">
              {task.skills?.map((skill, index) => (
                <Badge variant="secondary" key={index}>{skill}</Badge>
              ))}
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
              {task.employer?.name && (
                <div className="flex items-center">
                  <Users className="mr-1 h-4 w-4" />
                  <span>{task.employer.name}</span>
                </div>
              )}
              {task.location && (
                <div className="flex items-center">
                  <MapPin className="mr-1 h-4 w-4" />
                  <span>{task.location}</span>
                </div>
              )}
              {(task.start_date || task.startDate) && (
                <div className="flex items-center">
                  <Calendar className="mr-1 h-4 w-4" />
                  <span>{task.start_date || task.startDate}</span>
                </div>
              )}
              {task.budget_display && (
                <div className="flex items-center">
                  <Clock className="mr-1 h-4 w-4" />
                  <span>{task.budget_display}</span>
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-2 sm:justify-end mt-2">
              <Link href={`/dashboard/tasks/${task.uuid}`}>
                <Button variant="outline" size={isMobile ? "sm" : "default"}>查看详情</Button>
              </Link>
              {task.is_creator && task.status === "recruiting" && (
                <Button variant="outline" size={isMobile ? "sm" : "default"}>查看申请</Button>
              )}
              {!task.is_creator && !task.is_applicant && task.status === "recruiting" && (
                <Button onClick={() => handleApplyTask(task.uuid)} size={isMobile ? "sm" : "default"}>申请任务</Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    ))
  }
  
  async function handleApplyTask(taskId: string | undefined) {
    if (!taskId) return;
    
    try {
      // 跳转到申请页面
      window.location.href = `/dashboard/tasks/${taskId}/apply`;
    } catch (error: any) {
      console.error("申请任务失败:", error);
      toast.error(error.message || "申请任务失败，请稍后重试");
    }
  }
}
