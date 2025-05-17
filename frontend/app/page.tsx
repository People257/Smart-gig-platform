import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight, Briefcase, Clock, Shield, Users } from "lucide-react"

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="border-b">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-xl">
            <Briefcase className="h-6 w-6" />
            <span>智慧零工平台</span>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/tasks" className="text-sm font-medium hover:underline">
              浏览任务
            </Link>
            <Link href="/about" className="text-sm font-medium hover:underline">
              关于我们
            </Link>
            <Link href="/help" className="text-sm font-medium hover:underline">
              帮助中心
            </Link>
          </nav>
          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="outline" size="sm" className="md:size-default">
                登录
              </Button>
            </Link>
            <Link href="/register">
              <Button size="sm" className="md:size-default">
                注册
              </Button>
            </Link>
          </div>
        </div>
      </header>
      <main className="flex-1">
        <section className="py-12 md:py-24 lg:py-32 bg-muted">
          <div className="container px-4 md:px-6">
            <div className="grid gap-6 lg:grid-cols-2 lg:gap-12 items-center">
              <div className="space-y-4">
                <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
                  连接雇主与人才的智慧零工平台
                </h1>
                <p className="max-w-[600px] text-muted-foreground md:text-xl">
                  灵活就业新选择，高效匹配优质任务与专业人才，安全可靠的智能服务平台
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Link href="/register?type=employer">
                    <Button size="lg">
                      我是雇主
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                  <Link href="/register?type=worker">
                    <Button size="lg" variant="outline">
                      我是零工
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </div>
              <div className="flex justify-center">
                <img
                  src="/placeholder.svg?height=400&width=500"
                  alt="智慧零工平台"
                  className="rounded-lg object-cover"
                  width={500}
                  height={400}
                />
              </div>
            </div>
          </div>
        </section>
        <section className="py-12 md:py-24 lg:py-32">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">平台优势</h2>
                <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  为什么选择我们的智慧零工平台
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
              <div className="flex flex-col items-center space-y-4 text-center">
                <div className="bg-primary/10 p-4 rounded-full">
                  <Users className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-bold">精准匹配</h3>
                <p className="text-muted-foreground">智能算法为雇主和零工提供精准匹配，提高合作效率</p>
              </div>
              <div className="flex flex-col items-center space-y-4 text-center">
                <div className="bg-primary/10 p-4 rounded-full">
                  <Clock className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-bold">灵活就业</h3>
                <p className="text-muted-foreground">自由选择工作时间和地点，实现工作与生活的平衡</p>
              </div>
              <div className="flex flex-col items-center space-y-4 text-center">
                <div className="bg-primary/10 p-4 rounded-full">
                  <Shield className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-bold">安全保障</h3>
                <p className="text-muted-foreground">实名认证和评价体系，保障交易安全和服务质量</p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <footer className="border-t py-6 md:py-0">
        <div className="container flex flex-col md:flex-row items-center justify-between gap-4 md:h-16">
          <p className="text-sm text-muted-foreground">© 2025 智慧零工平台. 保留所有权利.</p>
          <div className="flex gap-4">
            <Link href="/terms" className="text-sm text-muted-foreground hover:underline">
              服务条款
            </Link>
            <Link href="/privacy" className="text-sm text-muted-foreground hover:underline">
              隐私政策
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
