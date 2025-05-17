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

export default function TasksPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [isLoading, setIsLoading] = useState(true)
  const [tasks, setTasks] = useState([])

  useEffect(() => {
    // 这里将调用获取任务列表的API
    // async function fetchTasks() {
    //   try {
    //     const response = await fetch('/api/tasks');
    //     if (!response.ok) throw new Error('获取任务列表失败');
    //     const data = await response.json();
    //     setTasks(data);
    //   } catch (error) {
    //     console.error('获取任务列表失败:', error);
    //   } finally {
    //     setIsLoading(false);
    //   }
    // }

    // fetchTasks();

    // 模拟加载状态
    const timer = setTimeout(() => {
      setIsLoading(false)
      setTasks([])
    }, 1500)

    return () => clearTimeout(timer)
  }, [])

  const getStatusBadge = (status) => {
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
    // 搜索过滤
    const matchesSearch =
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.description.toLowerCase().includes(searchQuery.toLowerCase())

    // 状态过滤
    const matchesStatus = statusFilter === "all" || task.status === statusFilter

    return matchesSearch && matchesStatus
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">任务管理</h1>
        <Link href="/dashboard/tasks/create">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">发布任务</span>
            <span className="sm:hidden">发布</span>
          </Button>
        </Link>
      </div>

      <Tabs defaultValue="all">
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
          {isLoading ? (
            Array(3)
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
          ) : filteredTasks.length > 0 ? (
            filteredTasks.map((task) => (
              <Card key={task.id}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg">{task.title}</CardTitle>
                    {getStatusBadge(task.status)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4">
                    <p className="text-sm text-muted-foreground line-clamp-2">{task.description}</p>
                    <div className="flex flex-wrap gap-2">
                      {task.skills.map((skill, index) => (
                        <Badge key={index} variant="secondary">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
                      <div className="flex items-center">
                        <MapPin className="mr-1 h-3.5 w-3.5" />
                        <span>{task.location}</span>
                      </div>
                      <div className="flex items-center">
                        <Calendar className="mr-1 h-3.5 w-3.5" />
                        <span>
                          {task.startDate} 至 {task.endDate}
                        </span>
                      </div>
                      <div className="flex items-center">
                        <Users className="mr-1 h-3.5 w-3.5" />
                        <span>{task.applicants}人申请</span>
                      </div>
                      <div className="flex items-center font-medium">{task.budget}</div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm">
                        查看详情
                      </Button>
                      {task.status === "recruiting" && <Button size="sm">申请任务</Button>}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="rounded-full bg-muted p-3 mb-4">
                <Search className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium">未找到任务</h3>
              <p className="text-sm text-muted-foreground mt-1 mb-4">
                {searchQuery || statusFilter !== "all"
                  ? "没有符合当前筛选条件的任务，请尝试调整筛选条件"
                  : "暂无任务数据，您可以发布新任务或浏览任务市场"}
              </p>
              {searchQuery || statusFilter !== "all" ? (
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchQuery("")
                    setStatusFilter("all")
                  }}
                >
                  清除筛选条件
                </Button>
              ) : (
                <div className="flex flex-col sm:flex-row gap-2">
                  <Link href="/dashboard/tasks/create">
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      发布任务
                    </Button>
                  </Link>
                  <Link href="/tasks">
                    <Button variant="outline">浏览任务市场</Button>
                  </Link>
                </div>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="my">
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-muted p-3 mb-4">
              <Clock className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium">我的任务将在这里显示</h3>
            <p className="text-sm text-muted-foreground mt-1 mb-4">您可以在这里查看您发布或参与的任务</p>
            <Link href="/dashboard/tasks/create">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                发布任务
              </Button>
            </Link>
          </div>
        </TabsContent>

        <TabsContent value="favorite">
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-muted p-3 mb-4">
              <Clock className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium">收藏的任务将在这里显示</h3>
            <p className="text-sm text-muted-foreground mt-1 mb-4">您可以收藏感兴趣的任务以便稍后查看</p>
            <Link href="/tasks">
              <Button variant="outline">浏览任务市场</Button>
            </Link>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
