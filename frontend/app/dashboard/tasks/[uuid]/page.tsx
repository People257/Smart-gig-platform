"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { tasksApi } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card"
import { toast } from "sonner"
import { useAuth } from "@/lib/auth-context"
import { Skeleton } from "@/components/ui/skeleton"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"

// 申请人类型定义
interface Applicant {
  uuid: string;
  worker: {
    uuid: string;
    name: string;
    avatar_url: string;
  };
  status: string;
  applied_at: string;
  cover_letter?: string;
}

export default function TaskDetailPage() {
  const router = useRouter()
  const params = useParams()
  const uuid = params?.uuid as string
  const [task, setTask] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [applying, setApplying] = useState(false)
  const [completing, setCompleting] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [acceptingApplication, setAcceptingApplication] = useState<string | null>(null)
  const [showVerificationAlert, setShowVerificationAlert] = useState(false)
  const { user } = useAuth()

  // 获取任务详情
  const fetchTaskDetails = async () => {
    setLoading(true)
    try {
      console.log("开始获取任务详情")
      const res = await tasksApi.getTaskByUUID(uuid)
      console.log("获取任务详情响应:", res)
      if (res.success && res.data && res.data.task) {
        console.log("获取到任务详情:", {
          uuid: res.data.task.uuid,
          status: res.data.task.status,
          is_worker: res.data.task.is_worker,
          is_applicant: res.data.task.is_applicant,
          user: user?.user_type, 
          user_id: user?.id
        })
        setTask(res.data.task)
        console.log("设置任务状态后:", res.data.task)
      } else {
        toast.error(res.error || "未找到该任务")
        router.replace("/dashboard/tasks")
      }
    } catch (error) {
      console.error("获取任务详情出错:", error)
      toast.error("获取任务详情失败")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (uuid) {
      fetchTaskDetails()
    }
  }, [uuid, router])

  // 添加状态变化监听器，用于调试
  useEffect(() => {
    if (task) {
      console.log("任务状态更新:", {
        uuid: task.uuid,
        title: task.title,
        status: task.status,
        is_worker: task.is_worker,
        is_applicant: task.is_applicant,
        user_type: user?.user_type,
        show_complete_button: (task.is_worker || task.status === "in_progress") && task.status === "in_progress"
      })
    }
  }, [task])

  const handleApply = async () => {
    if (!task) return
    setApplying(true)
    try {
      console.log("申请前状态:", { is_applicant: task.is_applicant })
      const res = await tasksApi.applyToTask(task.uuid, { cover_letter: "" })
      console.log("申请返回结果:", res)
      if (res.success) {
        toast.success("申请成功")
        await fetchTaskDetails() // 重新加载任务详情
        console.log("申请后重新加载状态:", { 
          is_applicant: task.is_applicant,
          task_status: task.status
        })
      } else {
        // 检查是否需要实名认证
        if (res.data && res.data.require_verification) {
          setShowVerificationAlert(true)
        } else {
          toast.error(res.error || "申请失败")
        }
      }
    } catch (error) {
      console.error("申请任务出错:", error)
      toast.error("申请失败，请稍后重试")
    } finally {
      setApplying(false)
    }
  }

  const handleComplete = async () => {
    if (!task) return
    setCompleting(true)
    try {
      const res = await tasksApi.completeTask(task.uuid)
      if (res.success) {
        toast.success(res.data?.message || "任务已完成，等待雇主确认")
        fetchTaskDetails() // 重新加载任务详情
      } else {
        toast.error(res.error || "操作失败")
      }
    } catch (error) {
      console.error("完成任务出错:", error)
      toast.error("操作失败，请稍后重试")
    } finally {
      setCompleting(false)
    }
  }

  const handleConfirm = async () => {
    if (!task) return
    setConfirming(true)
    try {
      const res = await tasksApi.confirmTaskCompletion(task.uuid)
      if (res.success) {
        toast.success(res.data?.message || "已确认任务完成并支付报酬")
        fetchTaskDetails() // 重新加载任务详情
      } else {
        toast.error(res.error || "操作失败")
      }
    } catch (error) {
      console.error("确认任务出错:", error)
      toast.error("操作失败，请稍后重试")
    } finally {
      setConfirming(false)
    }
  }

  const handleAcceptApplication = async (applicationUUID: string) => {
    setAcceptingApplication(applicationUUID)
    try {
      const res = await tasksApi.acceptApplication(applicationUUID)
      if (res.success) {
        toast.success("已接受申请，任务已进入进行中状态")
        fetchTaskDetails() // 重新加载任务详情
      } else {
        toast.error(res.error || "操作失败")
      }
    } catch (error) {
      console.error("接受申请出错:", error)
      toast.error("接受申请失败，请稍后重试")
    } finally {
      setAcceptingApplication(null)
    }
  }

  const navigateToVerification = () => {
    router.push("/dashboard/profile")
  }

  const renderActionButton = () => {
    if (!user) return null
    
    console.log("渲染操作按钮:", {
      user_type: user.user_type, 
      is_worker: task.is_worker,
      is_applicant: task.is_applicant,
      task_status: task.status,
      employer_match: user.user_type === "employer" && task.employer?.uuid === user.uuid
    })
    
    if (user.user_type === "worker") {
      // 工人视角
      // 先判断是否是任务执行者且任务进行中
      if ((task.is_worker || task.status === "in_progress") && task.status === "in_progress") {
        // 是任务执行者且任务进行中，或者任务进行中但is_worker字段可能不准确，强制显示完成按钮
        return (
          <Button onClick={handleComplete} disabled={completing}>
            {completing ? "处理中..." : "完成任务"}
          </Button>
        )
      } else if (task.is_worker && ["payment_pending", "completed"].includes(task.status)) {
        // 任务已完成或支付中
        return <Button disabled>{task.status === "completed" ? "任务已完成" : "等待付款"}</Button>
      } else if (task.is_applicant) {
        // 已申请但未被接受
        return <Button disabled>已申请</Button>
      } else if (task.status === "recruiting") {
        // 未申请且招募中
        return (
          <Button onClick={handleApply} disabled={applying}>
            {applying ? "申请中..." : "接受任务"}
          </Button>
        )
      }
    } else if (user.user_type === "employer" && task.employer?.uuid === user.uuid) {
      // 雇主视角 - 自己发布的任务
      if (task.status === "payment_pending") {
        return (
          <Button onClick={handleConfirm} disabled={confirming}>
            {confirming ? "处理中..." : "确认任务完成并支付"}
          </Button>
        )
      } else if (task.status === "completed") {
        return <Button disabled>已完成并支付</Button>
      }
    }
    
    return null
  }

  const renderApplicantsList = () => {
    // 只有任务发布者且任务状态为招募中时才显示申请人列表
    if (!user || user.user_type !== "employer" || task.employer?.uuid !== user.uuid || task.status !== "recruiting" || !task.applicants || task.applicants.length === 0) {
      return null;
    }

    return (
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>申请人列表</CardTitle>
          <CardDescription>查看并管理所有申请此任务的工作者</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {task.applicants.map((applicant: Applicant) => (
            <div key={applicant.uuid} className="flex items-start justify-between border-b pb-4 last:border-0 last:pb-0">
              <div className="flex items-start gap-3">
                <Avatar>
                  <AvatarImage src={applicant.worker.avatar_url} />
                  <AvatarFallback>{applicant.worker.name?.[0] || "U"}</AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-medium">{applicant.worker.name}</div>
                  <div className="text-sm text-muted-foreground">申请时间: {new Date(applicant.applied_at).toLocaleString()}</div>
                  {applicant.cover_letter && (
                    <p className="mt-2 text-sm">{applicant.cover_letter}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={applicant.status === "pending" ? "outline" : "secondary"}>
                  {formatApplicationStatus(applicant.status)}
                </Badge>
                {applicant.status === "pending" && (
                  <Button 
                    onClick={() => handleAcceptApplication(applicant.uuid)}
                    disabled={acceptingApplication === applicant.uuid}
                    size="sm"
                  >
                    {acceptingApplication === applicant.uuid ? "处理中..." : "接受"}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto py-8">
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-2/3" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!task) {
    return <div className="text-center py-8">任务不存在或已被删除</div>
  }

  return (
    <div className="max-w-2xl mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>{task.title}</CardTitle>
          <div className="flex items-center mt-2">
            <Badge variant={getBadgeVariantForStatus(task.status)}>
              {formatTaskStatus(task.status)}
            </Badge>
            {task.is_worker && task.status === "in_progress" && (
              <span className="ml-2 text-sm text-green-600">您是此任务的执行者，可以点击"完成任务"提交工作</span>
            )}
            {task.is_applicant && task.status === "recruiting" && (
              <span className="ml-2 text-sm text-gray-600">您已申请此任务，等待雇主审核</span>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div><b>描述：</b>{task.description}</div>
          <div><b>雇主：</b>{task.employer?.name || '-'}</div>
          <div><b>金额：</b>¥{task.budget_amount}</div>
          <div><b>地点：</b>{task.location || '线上'}</div>
          <div><b>时间：</b>{task.start_date} 至 {task.end_date}</div>
          
          {renderActionButton()}
        </CardContent>
      </Card>

      {/* 申请人列表 */}
      {renderApplicantsList()}

      {/* 实名认证提示对话框 */}
      <AlertDialog open={showVerificationAlert} onOpenChange={setShowVerificationAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>需要实名认证</AlertDialogTitle>
            <AlertDialogDescription>
              根据平台规定，您需要完成实名认证后才能申请任务。实名认证可以保障平台交易安全，提高用户信任度。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={navigateToVerification}>
              前往认证
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

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

// 格式化申请状态展示
function formatApplicationStatus(status: string): string {
  const statusMap: { [key: string]: string } = {
    pending: "待处理",
    accepted: "已接受",
    rejected: "已拒绝",
    withdrawn: "已撤回"
  }
  
  return statusMap[status] || status
}

// 获取不同状态的Badge样式
function getBadgeVariantForStatus(status: string): "default" | "secondary" | "destructive" | "outline" {
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