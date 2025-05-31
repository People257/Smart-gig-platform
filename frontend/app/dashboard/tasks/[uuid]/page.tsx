"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { tasksApi } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { toast } from "sonner"

export default function TaskDetailPage() {
  const router = useRouter()
  const params = useParams()
  const uuid = params?.uuid as string
  const [task, setTask] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [applying, setApplying] = useState(false)

  useEffect(() => {
    if (!uuid) return
    setLoading(true)
    tasksApi.getTaskByUUID(uuid).then(res => {
      if (res.success && res.data && res.data.task) {
        setTask(res.data.task)
      } else {
        toast.error(res.error || "未找到该任务")
        router.replace("/dashboard/tasks")
      }
      setLoading(false)
    })
  }, [uuid, router])

  const handleApply = async () => {
    if (!task) return
    setApplying(true)
    const res = await tasksApi.applyToTask(task.uuid, {})
    setApplying(false)
    if (res.success) {
      toast.success("已成功申请该任务")
      // 可选：跳转到"我的任务"或刷新页面
    } else if (res.status === 401) {
      toast.error("请先登录后再接受任务")
      router.push("/login")
    } else {
      toast.error(res.error || "申请失败")
    }
  }

  if (loading) return <div className="p-8 text-center">加载中...</div>
  if (!task) return null

  return (
    <div className="max-w-2xl mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>{task.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div><b>描述：</b>{task.description}</div>
          <div><b>雇主：</b>{task.employer_name || task.employer?.name || "-"}</div>
          <div><b>金额：</b>¥{task.amount}</div>
          {/* 可根据实际字段补充更多信息 */}
          <Button onClick={handleApply} disabled={applying}>
            {applying ? "申请中..." : "接受任务"}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
} 