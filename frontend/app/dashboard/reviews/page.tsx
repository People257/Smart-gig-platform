"use client"

import { useState, useEffect } from "react"
import { reviewsApi } from "@/lib/api"
import { useAuth } from "@/lib/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { Star } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"

export default function ReviewsPage() {
  const { user } = useAuth()
  const [pendingReviews, setPendingReviews] = useState<any[]>([])
  const [myReviews, setMyReviews] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedReview, setSelectedReview] = useState<any>(null)
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [activeTab, setActiveTab] = useState("pending")

  useEffect(() => {
    fetchData()
  }, [user])

  const fetchData = async () => {
    setLoading(true)
    try {
      // 获取待评价任务
      const pendingRes = await reviewsApi.getPendingReviews()
      console.log("获取待评价返回数据:", pendingRes)
      
      // 看看数据在哪里，进行调试
      if (pendingRes.success) {
        if (pendingRes.data && 'pending_reviews' in pendingRes.data) {
          // 数据在data.pending_reviews中
          setPendingReviews(pendingRes.data.pending_reviews)
        } else if ('pending_reviews' in (pendingRes as any)) {
          // 数据直接在pending_reviews中
          setPendingReviews((pendingRes as any).pending_reviews)
        } else {
          // 没找到数据，设为空数组
          console.log("没有找到待评价数据")
          setPendingReviews([])
        }
      }

      // 获取我收到的评价
      if (user?.uuid) {
        const reviewsRes = await reviewsApi.getUserReviews(user.uuid)
        if (reviewsRes.success && reviewsRes.data) {
          setMyReviews(reviewsRes.data.reviews || [])
        }
      }
    } catch (error) {
      console.error("获取评价数据失败:", error)
      toast.error("获取评价数据失败")
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitReview = async () => {
    if (!selectedReview) return

    if (!comment.trim()) {
      toast.error("请输入评价内容")
      return
    }

    setSubmitting(true)
    try {
      const res = await reviewsApi.createReview({
        rating,
        comment,
        task_uuid: selectedReview.task.uuid,
        reviewee_uuid: selectedReview.user.uuid,
      })

      if (res.success) {
        toast.success("评价提交成功")
        setSelectedReview(null)
        setRating(5)
        setComment("")
        fetchData() // 重新获取数据
      } else {
        toast.error(res.error || "评价提交失败")
      }
    } catch (error) {
      console.error("提交评价失败:", error)
      toast.error("提交评价失败")
    } finally {
      setSubmitting(false)
    }
  }

  const renderStars = (count: number, interactive = false) => {
    return Array(5)
      .fill(0)
      .map((_, i) => (
        <Star
          key={i}
          className={`h-5 w-5 ${
            i < count ? "text-yellow-400 fill-yellow-400" : "text-gray-300"
          } ${interactive ? "cursor-pointer" : ""}`}
          onClick={interactive ? () => setRating(i + 1) : undefined}
        />
      ))
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">我的评价</h1>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="pending">待评价 ({pendingReviews.length})</TabsTrigger>
          <TabsTrigger value="received">收到的评价 ({myReviews.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-4">
          {pendingReviews.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">暂无待评价任务</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {pendingReviews.map((review) => (
                <Card key={`${review.task.uuid}-${review.user.uuid}`}>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <Avatar>
                          <AvatarImage src={review.user.avatar_url} />
                          <AvatarFallback>{review.user.name?.[0] || "U"}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{review.user.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {review.user.user_type === "employer" ? "雇主" : "工作者"}
                          </p>
                        </div>
                      </div>
                      <div>
                        <p className="text-sm">任务: {review.task.title}</p>
                        <p className="text-xs text-muted-foreground">
                          完成于: {review.completed_at}
                        </p>
                      </div>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button onClick={() => setSelectedReview(review)}>评价</Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>评价 {review.user.name}</DialogTitle>
                            <DialogDescription>
                              请对该{review.user.user_type === "employer" ? "雇主" : "工作者"}的表现进行评价
                            </DialogDescription>
                          </DialogHeader>
                          <div className="py-4">
                            <div className="mb-4">
                              <Label>任务</Label>
                              <p className="text-sm">{review.task.title}</p>
                            </div>
                            <div className="mb-4">
                              <Label>评分</Label>
                              <div className="flex space-x-1 mt-1">
                                {renderStars(rating, true)}
                              </div>
                            </div>
                            <div className="mb-4">
                              <Label htmlFor="comment">评价内容</Label>
                              <Textarea
                                id="comment"
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                                placeholder="请输入您的评价内容..."
                                className="mt-1"
                              />
                            </div>
                          </div>
                          <DialogFooter>
                            <Button variant="outline" onClick={() => setSelectedReview(null)}>
                              取消
                            </Button>
                            <Button onClick={handleSubmitReview} disabled={submitting}>
                              {submitting ? "提交中..." : "提交评价"}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="received" className="mt-4">
          {myReviews.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">暂无收到的评价</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {myReviews.map((review) => (
                <Card key={review.uuid}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-4">
                        <Avatar>
                          <AvatarImage src={review.reviewer.avatar_url} />
                          <AvatarFallback>{review.reviewer.name?.[0] || "U"}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{review.reviewer.name}</p>
                          <div className="flex space-x-1 mt-1">{renderStars(review.rating)}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm">任务: {review.task.title}</p>
                        <p className="text-xs text-muted-foreground">
                          评价于: {new Date(review.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 text-sm">{review.comment}</div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
} 