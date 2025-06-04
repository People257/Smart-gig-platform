"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowDownUp, ArrowUpRight, Calendar, CreditCard, Download, Search, Wallet, Plus } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { paymentsApi } from "@/lib/api" 
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogClose } from "@/components/ui/dialog"
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form"
import { useForm } from "react-hook-form"

interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: "income" | "expense";
  status: "completed" | "pending" | "failed";
}

interface PaymentData {
  balance: number;
  totalIncome: number;
  totalExpense: number;
  withdrawalAccounts?: any[];
  transactions: Transaction[];
}

export default function PaymentsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [dateFilter, setDateFilter] = useState("all")
  const [isLoading, setIsLoading] = useState(true)
  const [paymentData, setPaymentData] = useState<PaymentData>({
    balance: 0,
    totalIncome: 0,
    totalExpense: 0,
    transactions: []
  })
  const [withdrawOpen, setWithdrawOpen] = useState(false)
  const withdrawForm = useForm<{ alipay_account: string; amount: number }>({
    defaultValues: { alipay_account: "", amount: 0 },
  })

  useEffect(() => {
    const fetchPaymentData = async () => {
      try {
        setIsLoading(true)
        console.log("正在获取支付数据...")
        const response = await paymentsApi.getPaymentsData()
        
        if (response.success && response.data) {
          console.log("成功获取支付数据:", response.data)
          
          // 确保所有必要的字段都存在，给缺失字段提供默认值
          const normalizedData = {
            balance: response.data.balance || 0,
            totalIncome: response.data.totalIncome || 0,
            totalExpense: response.data.totalExpense || 0,
            withdrawalAccounts: response.data.withdrawalAccounts || [],
            transactions: response.data.transactions || []
          }
          
          setPaymentData(normalizedData)
        } else {
          console.error("获取支付数据失败:", response.error)
          toast.error("获取支付数据失败: " + (response.error || "未知错误"))
          
          // 在API调用失败时保持现有数据状态，不修改
          // 如果是第一次加载（没有数据），设置默认值
          setPaymentData(prevData => ({
            balance: prevData.balance || 0,
            totalIncome: prevData.totalIncome || 0,
            totalExpense: prevData.totalExpense || 0,
            withdrawalAccounts: prevData.withdrawalAccounts || [],
            transactions: prevData.transactions || []
          }))
        }
      } catch (error) {
        console.error('获取支付数据异常:', error)
        toast.error("获取数据失败，请稍后重试")
        
        // 在异常情况下保持现有数据状态
        setPaymentData(prevData => ({
          balance: prevData.balance || 0,
          totalIncome: prevData.totalIncome || 0,
          totalExpense: prevData.totalExpense || 0,
          withdrawalAccounts: prevData.withdrawalAccounts || [],
          transactions: prevData.transactions || []
        }))
      } finally {
        setIsLoading(false)
      }
    }

    fetchPaymentData()
  }, [])

  const handleWithdraw = () => {
      if (paymentData.balance <= 0) {
        toast.error("您的余额不足，无法提现")
        return
      }
    setWithdrawOpen(true)
  }

  const onWithdrawSubmit = async (values: { alipay_account: string; amount: number }) => {
    if (values.amount > paymentData.balance) {
      toast.error("提现金额不能大于余额")
        return
      }
    const res = await paymentsApi.requestWithdrawal(values)
    if (res.success) {
      toast.success("提现申请已提交")
      setWithdrawOpen(false)
      withdrawForm.reset()
      // 刷新数据
      const response = await paymentsApi.getPaymentsData()
      if (response.success && response.data) {
        setPaymentData({
          balance: response.data.balance || 0,
          totalIncome: response.data.totalIncome || 0,
          totalExpense: response.data.totalExpense || 0,
          transactions: response.data.transactions || []
        })
      }
    } else {
      toast.error(res.error || "提现失败")
    }
  }

  const filterTransactions = (type: string) => {
    if (!paymentData.transactions || !Array.isArray(paymentData.transactions)) {
      console.log("No transactions found or invalid data")
      return []
    }
    
    let filtered = [...paymentData.transactions]
    
    // 应用类型过滤
    if (type === "income") {
      filtered = filtered.filter(t => t && t.type === "income")
    } else if (type === "expense") {
      filtered = filtered.filter(t => t && t.type === "expense")
    }
    
    // 应用搜索过滤
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(t => 
        t && (
          (t.description && t.description.toLowerCase().includes(query)) || 
          (t.id && t.id.toLowerCase().includes(query))
        )
      )
    }
    
    // 应用日期过滤
    if (dateFilter !== "all") {
      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
      
      filtered = filtered.filter(t => {
        if (!t || !t.date) return false
        
        try {
          const transactionDate = new Date(t.date).getTime()
          if (dateFilter === "today") {
            return transactionDate >= today
          } else if (dateFilter === "week") {
            const weekAgo = today - 7 * 24 * 60 * 60 * 1000
            return transactionDate >= weekAgo
          } else if (dateFilter === "month") {
            const monthAgo = today - 30 * 24 * 60 * 60 * 1000
            return transactionDate >= monthAgo
          }
          return true
        } catch (e) {
          console.error("Error parsing date:", t.date, e)
          return false
        }
      })
    }
    
    return filtered
  }

  return (
    <div className="space-y-4 sm:space-y-6 pb-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">支付结算</h1>
        <Dialog open={withdrawOpen} onOpenChange={setWithdrawOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleWithdraw} className="w-full sm:w-auto">
          <Wallet className="mr-2 h-4 w-4" />
              <span>申请提现</span>
        </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>申请提现</DialogTitle>
              <DialogDescription>请输入支付宝账号和提现金额</DialogDescription>
            </DialogHeader>
            <Form {...withdrawForm}>
              <form onSubmit={withdrawForm.handleSubmit(onWithdrawSubmit)} className="space-y-4">
                <FormField
                  control={withdrawForm.control}
                  name="alipay_account"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>支付宝账号</FormLabel>
                      <FormControl>
                        <Input placeholder="请输入支付宝账号" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={withdrawForm.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>提现金额</FormLabel>
                      <FormControl>
                        <Input type="number" min={1} max={paymentData.balance} step="0.01" placeholder="请输入提现金额" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
                  <Button type="submit" className="w-full sm:w-auto">提交申请</Button>
                  <DialogClose asChild>
                    <Button type="button" variant="outline" className="w-full sm:w-auto">取消</Button>
                  </DialogClose>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">账户余额</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="text-xl sm:text-2xl font-bold">¥{paymentData.balance?.toLocaleString() || '0'}</div>
                <p className="text-xs text-muted-foreground">可提现金额</p>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总收入</CardTitle>
            <ArrowDownUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="text-xl sm:text-2xl font-bold text-green-500">
                  ¥{paymentData.totalIncome?.toLocaleString() || '0'}
                </div>
                <p className="text-xs text-muted-foreground">已完成交易</p>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总支出</CardTitle>
            <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="text-xl sm:text-2xl font-bold text-red-500">
                  ¥{paymentData.totalExpense?.toLocaleString() || '0'}
                </div>
                <p className="text-xs text-muted-foreground">提现金额</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle>交易记录</CardTitle>
          <CardDescription>查看您的收支明细</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
              <TabsList className="w-full md:w-auto grid grid-cols-3 md:flex">
                <TabsTrigger value="all" className="text-xs sm:text-sm">
                  全部
                </TabsTrigger>
                <TabsTrigger value="income" className="text-xs sm:text-sm">
                  收入
                </TabsTrigger>
                <TabsTrigger value="expense" className="text-xs sm:text-sm">
                  支出
                </TabsTrigger>
              </TabsList>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="搜索交易..."
                    className="pl-8 w-full"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                <Select value={dateFilter} onValueChange={setDateFilter}>
                    <SelectTrigger className="w-full sm:w-[130px]">
                    <Calendar className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="时间范围" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部时间</SelectItem>
                    <SelectItem value="today">今天</SelectItem>
                    <SelectItem value="week">最近7天</SelectItem>
                    <SelectItem value="month">最近30天</SelectItem>
                  </SelectContent>
                </Select>
                </div>
              </div>
            </div>

            <TabsContent value="all">
              {renderTransactionsTable(filterTransactions("all"))}
            </TabsContent>

            <TabsContent value="income">
              {renderTransactionsTable(filterTransactions("income"))}
            </TabsContent>

            <TabsContent value="expense">
              {renderTransactionsTable(filterTransactions("expense"))}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
  
  function renderTransactionsTable(transactions: Transaction[]) {
    return (
      <div className="rounded-md border">
        {/* 桌面版表头 */}
        <div className="hidden sm:grid sm:grid-cols-5 p-4 text-sm font-medium border-b">
          <div>交易编号</div>
          <div>日期</div>
          <div className="col-span-2">描述</div>
          <div className="text-right">金额</div>
        </div>
        {isLoading ? (
          <div className="divide-y">
            {Array(4)
              .fill(0)
              .map((_, i) => (
                <div key={i} className="grid grid-cols-1 sm:grid-cols-5 p-4 text-sm gap-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-20" />
                  <div className="col-span-1 sm:col-span-2">
                    <Skeleton className="h-4 w-full" />
                  </div>
                  <div className="text-right">
                    <Skeleton className="h-4 w-16 ml-auto" />
                  </div>
                </div>
              ))}
          </div>
        ) : transactions.length > 0 ? (
          <div className="divide-y">
            {transactions.map((transaction) => (
              <div key={transaction.id} className="flex flex-col sm:grid sm:grid-cols-5 p-4 text-sm">
                {/* 移动端标题行 */}
                <div className="flex justify-between items-center mb-2 sm:hidden">
                  <div className="font-medium">{transaction.description}</div>
                  <div
                    className={`font-medium ${
                      transaction.type === "income" ? "text-green-500" : "text-red-500"
                    }`}
                  >
                    {transaction.type === "income" ? "+" : "-"}¥{transaction.amount.toLocaleString()}
                    {transaction.status === "pending" && (
                      <span className="ml-2 text-xs text-muted-foreground">(处理中)</span>
                    )}
                  </div>
                </div>
                
                {/* 移动端日期和ID */}
                <div className="flex justify-between text-xs text-muted-foreground mt-1 sm:hidden">
                <div>{transaction.date}</div>
                  <div>{transaction.id}</div>
                </div>
                
                {/* 桌面版完整布局 */}
                <div className="hidden sm:block text-muted-foreground">{transaction.id}</div>
                <div className="hidden sm:block">{transaction.date}</div>
                <div className="hidden sm:block sm:col-span-2">{transaction.description}</div>
                <div
                  className={`hidden sm:block text-right font-medium ${
                    transaction.type === "income" ? "text-green-500" : "text-red-500"
                  }`}
                >
                  {transaction.type === "income" ? "+" : "-"}¥{transaction.amount.toLocaleString()}
                  {transaction.status === "pending" && (
                    <span className="ml-2 text-xs text-muted-foreground">(处理中)</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center">
            <div className="flex flex-col items-center justify-center">
              <div className="rounded-full bg-muted p-3 mb-4">
                <CreditCard className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium">暂无交易记录</h3>
              <p className="text-sm text-muted-foreground mt-1 mb-4">完成任务后，您的交易记录将在这里显示</p>
            </div>
          </div>
        )}
      </div>
    )
  }
}
