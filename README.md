# 智慧零工平台

## 智慧零工平台是一个面向零工的一站式解决方案

智慧零工平台是一个连接雇主与零工（自由职业者/兼职人员）的在线平台。它旨在提供一个高效、安全、便捷的环境，让雇主可以发布短期任务或项目，零工可以找到合适的工作机会。

## ✨ 主要功能

*   **用户系统:**
    *   注册 (手机号/用户名，零工/雇主类型选择)
    *   登录 (手机号/用户名)
    *   个人资料管理 (基本信息、技能、作品集、实名认证 - 部分为占位/开发中)
    *   账户设置 (占位)
*   **任务管理 (雇主 & 零工):**
    *   发布任务 (雇主)
    *   浏览任务列表 (搜索、筛选状态)
    *   任务详情 (占位)
    *   申请任务 (占位)
    *   管理已发布/已申请/收藏的任务 (部分为占位)
*   **支付结算:**
    *   查看账户余额、总收入、总支出
    *   交易记录 (收入/支出，搜索、筛选时间)
    *   申请提现 (占位)
    *   管理提现账户 (占位)
*   **管理后台 (管理员):**
    *   控制台概览 (用户数、任务数、交易额、完成率、待处理事项、数据图表占位)
    *   用户管理 (导航占位)
    *   任务管理 (导航占位)
    *   交易管理 (导航占位)
    *   系统设置 (导航占位)
    *   权限管理 (导航占位)
*   **其他:**
    *   首页介绍与平台优势
    *   消息通知 (导航占位)
    *   日程安排 (导航占位)

## 🛠️ 技术栈

### 前端:
*   Next.js (v15.2.4, App Router)
*   React (v19)
*   TypeScript (v5)
*   Tailwind CSS (v3.4.17)
*   Shadcn/UI (Radix UI, Lucide React)
*   Sonner (for toasts)
*   Vaul (for drawers)
*   Embla Carousel
*   Recharts (for charts)

### 后端:
*   Go
*   Gin (Web Framework)
*   GORM (ORM)
*   MySQL (Database)

## ⚙️ 项目结构

```
├── frontend/         # 前端代码
├── backend/          # 后端代码
│   ├── api/          # API路由和控制器
│   ├── config/       # 配置文件
│   ├── db/           # 数据库相关
│   ├── docs/         # 文档
│   ├── models/       # 数据模型
│   ├── services/     # 业务逻辑
│   └── utils/        # 工具函数
└── README.md         # 项目说明文档
```

## 🚀 快速开始

### 前端

1.  **克隆仓库:**
    ```bash
    git clone <repository-url>
    cd <repository-name>
    ```

2.  **安装依赖:**
    ```bash
    cd frontend
    pnpm install
    ```

3.  **配置环境变量:**
    在frontend目录创建一个 `.env.local` 文件，并根据需要配置后端 API 地址等。
    ```env
    # 示例:
    NEXT_PUBLIC_API_BASE_URL=http://localhost:8080/api
    ```

4.  **运行开发服务器:**
    ```bash
    pnpm dev
    ```
    前端应用将在 `http://localhost:3000` 上运行。

### 后端

请参考 [backend/README.md](backend/README.md) 获取后端设置和启动指南。

## 📄 文档

- [API文档](backend/docs/api.md)
- [数据库设计](backend/db/schema.sql)

## 🤝 贡献

欢迎贡献！请遵循标准的 Fork & Pull Request 工作流。

## 📜 开源许可

[MIT](./LICENSE)