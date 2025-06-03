"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BarChart, Clock, DollarSign, FileText, Plus, Star, RefreshCw } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { dashboardApi } from "@/lib/api"
import { toast } from "sonner"
import { useAuth } from "@/lib/auth-context"
import { Badge } from "@/components/ui/badge"

// 定义仪表盘数据类型
interface DashboardData {
  activeTasks?: number;
  monthlyIncome?: number;
  workHours?: number;
  rating?: number;
  recentTasks?: {
    id: string;
    title: string;
    status: string;
    date: string;
    uuid: string;
  }[];
  activities?: {
    id: string;
    content: string;
    date: string;
  }[];
}

export default function DashboardPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [dashboardData, setDashboardData] = useState<DashboardData>({})
  const { user } = useAuth();

  // 提取函数到组件级别，使其可在其他地方调用
  const fetchDashboardData = async () => {
    try {
      setIsLoading(true)
      const { success, data, error } = await dashboardApi.getDashboardData()
      
      if (success && data) {
        setDashboardData(data)
      } else {
        toast.error("获取控制台数据失败: " + error)
      }
    } catch (error) {
      console.error('获取控制台数据失败:', error)
      toast.error("获取数据失败，请稍后重试")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboardData()
  }, [])

  // 格式化任务状态展示
  function formatTaskStatus(status: string): string {
    const statusMap: { [key: string]: string } = {
      pending_approval: "待批准",
      recruiting: "招募中",
      in_progress: "进行中",
      payment_pending: "待支付",
      completed: "已完成",
      closed: "已关闭",
      rejected: "已拒绝"
    }
    
    return statusMap[status] || status
  }

  // 获取状态对应的Badge样式
  function getStatusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
    const variantMap: { [key: string]: "default" | "secondary" | "destructive" | "outline" } = {
      recruiting: "default",
      in_progress: "secondary",
      payment_pending: "secondary",
      completed: "outline",
      closed: "destructive",
      rejected: "destructive",
      pending_approval: "outline"
    }
    
    return variantMap[status] || "default"
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">控制台</h1>
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

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">进行中的任务</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold">{dashboardData.activeTasks || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {dashboardData.activeTasks ? `共${dashboardData.activeTasks}个任务` : "暂无进行中的任务"}
                </p>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {user?.user_type === "worker" ? "本月收入" : "本月支出"}
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold">¥{dashboardData.monthlyIncome || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {user?.user_type === "worker" 
                    ? (dashboardData.monthlyIncome ? "本月已结算收入" : "暂无收入记录")
                    : (dashboardData.monthlyIncome ? "本月已结算支出" : "暂无支出记录")}
                </p>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {user?.user_type === "worker" ? "工作时长" : "项目总时长"}
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold">{dashboardData.workHours || 0}小时</div>
                <p className="text-xs text-muted-foreground">
                  {user?.user_type === "worker"
                    ? (dashboardData.workHours ? "累计工作时间" : "暂无工作记录")
                    : (dashboardData.workHours ? "项目总计时间" : "暂无项目记录")}
                </p>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">评分</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold">{dashboardData.rating || "--"}</div>
                <p className="text-xs text-muted-foreground">
                  {dashboardData.rating 
                    ? (user?.user_type === "worker" ? "客户评分" : "雇主评分")
                    : "暂无评价"}
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="tasks">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="tasks" className="flex-1 sm:flex-none">
            最近任务
          </TabsTrigger>
          <TabsTrigger value="activity" className="flex-1 sm:flex-none">
            活动记录
          </TabsTrigger>
        </TabsList>
        <TabsContent value="tasks" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>最近任务</CardTitle>
                <CardDescription>查看您最近参与的任务</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={fetchDashboardData} className="hidden sm:flex">
                <RefreshCw className="mr-2 h-4 w-4" />
                刷新
              </Button>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  {Array(3)
                    .fill(0)
                    .map((_, i) => (
                      <div key={i} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                        <div className="space-y-1">
                          <Skeleton className="h-5 w-48" />
                          <Skeleton className="h-4 w-32" />
                        </div>
                        <div className="flex items-center gap-2">
                          <Skeleton className="h-4 w-16" />
                          <Skeleton className="h-8 w-20" />
                        </div>
                      </div>
                    ))}
                </div>
              ) : dashboardData.recentTasks && dashboardData.recentTasks.length > 0 ? (
                <div className="space-y-4">
                  {dashboardData.recentTasks.map(task => (
                    <div key={task.id} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                      <div className="space-y-1">
                        <h3 className="font-medium">{task.title}</h3>
                        <p className="text-sm text-muted-foreground">{task.date}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={getStatusVariant(task.status)}>
                          {formatTaskStatus(task.status)}
                        </Badge>
                        <Link href={`/dashboard/tasks/${task.uuid}`}>
                          <Button size="sm" variant="outline">查看</Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="rounded-full bg-muted p-3 mb-4">
                    <FileText className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-medium">暂无任务记录</h3>
                  <p className="text-sm text-muted-foreground mt-1 mb-4">您可以发布或申请任务来开始使用平台</p>
                  <div className="flex flex-col sm:flex-row gap-2">
                    {user?.user_type === "employer" && (
                    <Link href="/dashboard/tasks/create">
                      <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        发布任务
                      </Button>
                    </Link>
                    )}
                    <Link href="/tasks">
                      <Button variant="outline">浏览任务</Button>
                    </Link>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>活动记录</CardTitle>
              <CardDescription>您的账户最近活动</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  {Array(3)
                    .fill(0)
                    .map((_, i) => (
                      <div key={i} className="flex items-start gap-4 border-b pb-4 last:border-0 last:pb-0">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className="space-y-1 flex-1">
                          <Skeleton className="h-5 w-full" />
                          <Skeleton className="h-4 w-24" />
                        </div>
                      </div>
                    ))}
                </div>
              ) : dashboardData.activities && dashboardData.activities.length > 0 ? (
                <div className="space-y-4">
                  {dashboardData.activities.map(activity => (
                    <div key={activity.id} className="flex items-start gap-4 border-b pb-4 last:border-0 last:pb-0">
                      <div className="rounded-full bg-muted p-3">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="space-y-1 flex-1">
                        <p>{activity.content}</p>
                        <p className="text-sm text-muted-foreground">{activity.date}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="rounded-full bg-muted p-3 mb-4">
                    <Clock className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-medium">暂无活动记录</h3>
                  <p className="text-sm text-muted-foreground mt-1">您的活动记录将在这里显示</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>收入统计</CardTitle>
            <CardDescription>查看您的收入趋势</CardDescription>
          </CardHeader>
          <CardContent className="h-[200px] flex items-center justify-center">
            {isLoading ? (
              <Skeleton className="h-full w-full" />
            ) : (
              <div className="flex flex-col items-center text-center">
                <BarChart className="h-16 w-16 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">暂无收入数据</p>
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>即将到期的任务</CardTitle>
            <CardDescription>需要您关注的任务</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {Array(2)
                  .fill(0)
                  .map((_, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Skeleton className="h-5 w-32" />
                        <Skeleton className="h-4 w-24" />
                      </div>
                      <Skeleton className="h-8 w-16" />
                    </div>
                  ))}
              </div>
            ) : dashboardData.recentTasks && dashboardData.recentTasks.length > 0 ? (
              <div className="space-y-4">
                {dashboardData.recentTasks.slice(0, 2).map(task => (
                  <div key={task.id} className="flex items-center justify-between">
                    <div className="space-y-1">
                      <h3 className="font-medium">{task.title}</h3>
                      <p className="text-sm text-muted-foreground">{task.date}</p>
                    </div>
                    <Link href={`/dashboard/tasks/${task.uuid}`}>
                      <Button size="sm" variant="outline">查看</Button>
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="rounded-full bg-muted p-3 mb-4">
                  <Clock className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium">暂无即将到期的任务</h3>
                <p className="text-sm text-muted-foreground mt-1">您的任务将在这里显示</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
