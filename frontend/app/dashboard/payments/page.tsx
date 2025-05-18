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

  useEffect(() => {
    const fetchPaymentData = async () => {
      try {
        setIsLoading(true)
        const { success, data, error } = await paymentsApi.getPaymentsData()
        
        if (success && data) {
          setPaymentData(data)
        } else {
          toast.error("获取支付数据失败: " + error)
        }
      } catch (error) {
        console.error('获取支付数据失败:', error)
        toast.error("获取数据失败，请稍后重试")
      } finally {
        setIsLoading(false)
      }
    }

    fetchPaymentData()
  }, [])

  const handleWithdraw = async () => {
    try {
      // 检查是否有足够的余额
      if (paymentData.balance <= 0) {
        toast.error("您的余额不足，无法提现")
        return
      }
      
      // 检查是否有提现账户
      if (!paymentData.withdrawalAccounts || paymentData.withdrawalAccounts.length === 0) {
        toast.error("请先添加提现账户")
        return
      }
      
      // 这里可以添加提现流程，例如打开提现表单
      toast("功能开发中", {
        description: "提现功能即将上线"
      })
    } catch (error) {
      console.error('提现操作失败:', error)
      toast.error("操作失败，请稍后重试")
    }
  }

  const handleAddAccount = async () => {
    try {
      // 这里可以添加添加账户流程，例如打开账户表单
      toast("功能开发中", {
        description: "添加提现账户功能即将上线"
      })
    } catch (error) {
      console.error('添加账户操作失败:', error)
      toast.error("操作失败，请稍后重试")
    }
  }

  const filterTransactions = (type: string) => {
    if (!paymentData.transactions) return []
    
    let filtered = [...paymentData.transactions]
    
    // 应用类型过滤
    if (type === "income") {
      filtered = filtered.filter(t => t.type === "income")
    } else if (type === "expense") {
      filtered = filtered.filter(t => t.type === "expense")
    }
    
    // 应用搜索过滤
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(t => 
        t.description.toLowerCase().includes(query) || 
        t.id.toLowerCase().includes(query)
      )
    }
    
    // 应用日期过滤
    if (dateFilter !== "all") {
      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
      
      filtered = filtered.filter(t => {
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
      })
    }
    
    return filtered
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">支付结算</h1>
        <Button onClick={handleWithdraw}>
          <Wallet className="mr-2 h-4 w-4" />
          <span className="hidden sm:inline">申请提现</span>
          <span className="sm:hidden">提现</span>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
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
                <div className="text-2xl font-bold">¥{paymentData.balance.toLocaleString()}</div>
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
                <div className="text-2xl font-bold text-green-500">
                  ¥{paymentData.totalIncome.toLocaleString()}
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
                <div className="text-2xl font-bold text-red-500">
                  ¥{paymentData.totalExpense.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">提现金额</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>交易记录</CardTitle>
          <CardDescription>查看您的收支明细</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
              <TabsList className="w-full sm:w-auto">
                <TabsTrigger value="all" className="flex-1 sm:flex-none">
                  全部
                </TabsTrigger>
                <TabsTrigger value="income" className="flex-1 sm:flex-none">
                  收入
                </TabsTrigger>
                <TabsTrigger value="expense" className="flex-1 sm:flex-none">
                  支出
                </TabsTrigger>
              </TabsList>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="搜索交易..."
                    className="pl-8"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <Select value={dateFilter} onValueChange={setDateFilter}>
                  <SelectTrigger className="w-[130px]">
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
                <Button variant="outline" size="icon">
                  <Download className="h-4 w-4" />
                </Button>
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

      <Card>
        <CardHeader>
          <CardTitle>提现账户</CardTitle>
          <CardDescription>管理您的提现账户信息</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : paymentData.withdrawalAccounts && paymentData.withdrawalAccounts.length > 0 ? (
            <div className="space-y-4">
              {/* 显示提现账户列表 */}
              {paymentData.withdrawalAccounts.map((account, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{account.bank_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {account.account_number.replace(/(?<=^\d{4})\d+(?=\d{4}$)/, '****')}
                        </p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm">设为默认</Button>
                  </div>
                </div>
              ))}
              <Button variant="outline" className="w-full" onClick={handleAddAccount}>
                <Plus className="mr-2 h-4 w-4" />
                添加提现账户
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-col items-center justify-center p-8 border rounded-lg text-center">
                <div className="rounded-full bg-muted p-3 mb-4">
                  <CreditCard className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium">暂无提现账户</h3>
                <p className="text-sm text-muted-foreground mt-1 mb-4">添加提现账户以便申请提现</p>
              </div>
              <Button variant="outline" className="w-full" onClick={handleAddAccount}>
                <Plus className="mr-2 h-4 w-4" />
                添加提现账户
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
  
  function renderTransactionsTable(transactions: Transaction[]) {
    return (
      <div className="rounded-md border">
        <div className="grid grid-cols-5 p-4 text-sm font-medium border-b">
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
                <div key={i} className="grid grid-cols-5 p-4 text-sm">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-20" />
                  <div className="col-span-2">
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
              <div key={transaction.id} className="grid grid-cols-5 p-4 text-sm">
                <div className="text-muted-foreground">{transaction.id}</div>
                <div>{transaction.date}</div>
                <div className="col-span-2">{transaction.description}</div>
                <div
                  className={`text-right font-medium ${
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
