# 智慧零工平台 API 文档

## 基础信息

- 基础 URL: `/api` (例如: `http://localhost:8080/api`)
- 认证: 大多数需要用户身份验证的端点应在请求头中包含 `Authorization: Bearer <JWT_TOKEN>`

## 1. 认证 (Auth)

### 1.1. 发送验证码

**Endpoint:** `POST /auth/send-verification-code`

**描述:** 发送短信或邮件验证码用于注册或登录。

**请求体 (JSON):**
```json
{
  "phone_number": "string" // 11位手机号
}
```

**成功响应 (200 OK):**
```json
{
  "message": "验证码已发送"
}
```

**错误响应:**
- 400 Bad Request: `{"error": "手机号格式不正确"}`
- 429 Too Many Requests: `{"error": "请求过于频繁，请稍后再试"}`
- 500 Internal Server Error: `{"error": "发送验证码失败"}`

### 1.2. 用户注册

**Endpoint:** `POST /auth/register`

**描述:** 注册新用户。

**请求体 (JSON):**
```json
{
  "user_type": "worker" | "employer",    // 用户类型
  "method": "phone" | "username",       // 注册方式
  "phone_number": "string",             // (如果 method="phone")
  "verification_code": "string",        // (如果 method="phone")
  "username": "string",                 // (如果 method="username")
  "password": "string"                  // (如果 method="username")
}
```

**成功响应 (201 Created):**
```json
{
  "message": "注册成功",
  "user": {
    "uuid": "string", // GORM 通常用 `ID` (uint) 作为主键, `UUID` 作为公共标识符
    "username": "string",
    "user_type": "worker" | "employer"
    // ...其他用户信息
  },
  "token": "jwt_token" // (可选，注册后直接登录)
}
```

**错误响应:**
- 400 Bad Request: `{"error": "请求参数错误", "details": {"field_name": "error message"}}`
- 400 Bad Request: `{"error": "验证码错误或已过期"}`
- 409 Conflict: `{"error": "手机号已被注册" / "用户名已被注册"}`
- 500 Internal Server Error: `{"error": "注册失败"}`

### 1.3. 用户登录

**Endpoint:** `POST /auth/login`

**描述:** 用户登录。

**请求体 (JSON):**
```json
{
  "method": "phone" | "username",    // 登录方式
  "phone_number": "string",          // (如果 method="phone")
  "verification_code": "string",     // (如果 method="phone")
  "username": "string",              // (如果 method="username")
  "password": "string"               // (如果 method="username")
}
```

**成功响应 (200 OK):**
```json
{
  "message": "登录成功",
  "user": {
    "uuid": "string",
    "username": "string",
    "user_type": "worker" | "employer"
    // ...其他用户信息
  },
  "token": "jwt_token"
}
```

**错误响应:**
- 400 Bad Request: `{"error": "请求参数错误"}`
- 401 Unauthorized: `{"error": "用户名或密码错误" / "验证码错误或已过期"}`
- 500 Internal Server Error: `{"error": "登录失败"}`

### 1.4. 用户登出

**Endpoint:** `POST /auth/logout`

**描述:** 用户登出，通常会使当前 Token 失效 (例如加入黑名单)。

**认证:** 需要

**成功响应 (200 OK):**
```json
{
  "message": "登出成功"
}
```

**错误响应:**
- 500 Internal Server Error: `{"error": "登出失败"}`

## 2. 用户 (Users)

### 2.1. 获取当前用户资料

**Endpoint:** `GET /users/profile`

**描述:** 获取当前登录用户的详细资料。

**认证:** 需要

**成功响应 (200 OK):**
```json
{
  "uuid": "string",
  "name": "string",
  "email": "string",
  "phone_number": "string",
  "user_type": "worker" | "employer",
  "avatar_url": "string | null",
  "bio": "string | null",
  "location": "string | null",
  "hourly_rate": "number | null",      // (如果 userType="worker")
  "skills": ["string"],              // (如果 userType="worker")
  "is_identity_verified": "boolean",
  "created_at": "timestamp"          // ISO 8601 format
  // ...其他字段
}
```

**错误响应:**
- 401 Unauthorized: `{"error": "未授权"}`
- 404 Not Found: `{"error": "用户不存在"}`

### 2.2. 更新当前用户资料

**Endpoint:** `PUT /users/profile`

**描述:** 更新当前登录用户的资料。

**认证:** 需要

**请求体 (JSON):**
```json
{
  "name": "string",
  "bio": "string | null",
  "location": "string | null",
  "hourly_rate": "number | null", // (如果 userType="worker")
  "skills": ["string"]         // (如果 userType="worker")
}
```

**成功响应 (200 OK):**
```json
{
  "message": "资料更新成功",
  "user": { /* 更新后的用户资料，同 GET /users/profile */ }
}
```

**错误响应:**
- 400 Bad Request: `{"error": "请求参数错误", "details": { /* ... */ }}`
- 401 Unauthorized: `{"error": "未授权"}`

### 2.3. 上传用户头像

**Endpoint:** `POST /users/profile/avatar`

**描述:** 上传用户头像。

**认证:** 需要

**请求体 (FormData):**
```
avatar: (file)
```

**成功响应 (200 OK):**
```json
{
  "message": "头像上传成功",
  "avatar_url": "string" // 新头像的 URL
}
```

**错误响应:**
- 400 Bad Request: `{"error": "文件类型不支持或文件过大"}`

## 3. 任务 (Tasks)

### 3.1. 获取任务列表

**Endpoint:** `GET /tasks`

**描述:** 获取任务列表，支持分页、搜索和筛选。

**查询参数:**
- `page`: number (页码, e.g., 1, default: 1)
- `limit`: number (每页数量, e.g., 10, default: 10)
- `search_query`: string (搜索关键词)
- `status_filter`: "all" | "recruiting" | "in_progress" | "completed" | "closed"
- `user_scope`: "my_posted" | "my_applied" | "my_favorited" | "all" (区分用户发布的/申请的/收藏的/全部的任务)
- `skills`: string (逗号分隔的技能名称)
- `location_type`: "online" | "offline"
- `sort_by`: "created_at_desc" | "budget_asc" | ...

**成功响应 (200 OK):**
```json
{
  "tasks": [
    {
      "uuid": "string",
      "title": "string",
      "description": "string",
      "employer": { "uuid": "string", "name": "string", "avatar_url": "string" },
      "status": "recruiting" | "in_progress" | "completed" | "closed",
      "skills": ["string"],
      "location": "string", // "线上远程" 或具体地址
      "start_date": "date", // YYYY-MM-DD
      "end_date": "date",   // YYYY-MM-DD
      "budget_display": "string", // e.g., "500元/项目", "100元/小时"
      "applicants_count": "number",
      "created_at": "timestamp"
    }
    // ...更多任务
  ],
  "pagination": {
    "current_page": 1,
    "total_pages": 5,
    "total_items": 50,
    "items_per_page": 10
  }
}
```

**错误响应:**
- 400 Bad Request: `{"error": "无效的筛选参数"}`

### 3.2. 发布新任务

**Endpoint:** `POST /tasks`

**描述:** 雇主发布新任务。

**认证:** 需要 (雇主角色)

**请求体 (JSON):**
```json
{
  "title": "string",
  "description": "string",
  "location_type": "online" | "offline",
  "location_details": "string", // (如果 location_type="offline")
  "start_date": "date",        // YYYY-MM-DD
  "end_date": "date",          // YYYY-MM-DD
  "payment_type": "hourly" | "daily" | "fixed",
  "budget_amount": "number",
  "headcount": "number",       // 或 "10+" 这种字符串 (后端需处理)
  "skills": ["string"],      // 技能名称列表
  "is_public": "boolean",
  "is_urgent": "boolean"
}
```

**成功响应 (201 Created):**
```json
{
  "message": "任务发布成功",
  "task": { /* 创建的任务详情，同任务列表中的单个任务对象 */ }
}
```

**错误响应:**
- 400 Bad Request: `{"error": "请求参数错误", "details": { /* ... */ }}`
- 401 Unauthorized: `{"error": "未授权"}`
- 403 Forbidden: `{"error": "仅雇主可发布任务"}`

### 3.3. 获取任务详情

**Endpoint:** `GET /tasks/{task_uuid}`

**描述:** 获取特定任务的详细信息。

**成功响应 (200 OK):**
```json
{
  // 类似任务列表中的单个任务对象，但可能包含更多详情
  "uuid": "string",
  "title": "string",
  // ...
  "applications": [ // (对雇主可见)
    { "user_uuid": "string", "user_name": "string", "status": "pending" }
  ]
}
```

**错误响应:**
- 404 Not Found: `{"error": "任务未找到"}`

### 3.4. 申请任务

**Endpoint:** `POST /tasks/{task_uuid}/apply`

**描述:** 零工申请任务。

**认证:** 需要 (零工角色)

**请求体 (JSON) (可选):**
```json
{
  "cover_letter": "string" // 申请附言
}
```

**成功响应 (200 OK):**
```json
{
  "message": "任务申请成功"
}
```

**错误响应:**
- 400 Bad Request: `{"error": "已申请该任务" / "任务已关闭"}`
- 401 Unauthorized: `{"error": "未授权"}`
- 403 Forbidden: `{"error": "仅零工可申请任务"}`
- 404 Not Found: `{"error": "任务未找到"}`

## 4. 控制台 (Dashboard)

### 4.1. 获取控制台数据

**Endpoint:** `GET /dashboard`

**描述:** 获取用户控制台的概览数据。

**认证:** 需要

**成功响应 (200 OK):**
```json
{
  "ongoing_tasks_count": 0,
  "monthly_income": 0,
  "total_work_hours": 0,
  "average_rating": null, // or number
  "recent_tasks": [ /* 任务对象列表 */ ],
  "activity_log": [
    { "uuid": "string", "type": "string", "message": "string", "timestamp": "timestamp" }
  ],
  "income_stats": { /* 图表数据: e.g., {"labels": ["Jan", "Feb"], "data": [100, 200]} */ },
  "expiring_tasks": [ /* 任务对象列表 */ ]
}
```

## 5. 支付 (Payments)

### 5.1. 获取支付数据

**Endpoint:** `GET /payments`

**描述:** 获取用户的支付结算信息。

**认证:** 需要

**成功响应 (200 OK):**
```json
{
  "balance": 1250.75,
  "total_income": 5800.00,
  "total_expense": 4549.25, // (提现等)
  "transactions": [
    {
      "uuid": "string",
      "date": "2023-10-26",
      "description": "完成UI设计任务 #TASK456",
      "type": "income", // "income" | "expense"
      "amount": 500.00,
      "status": "completed" // "pending" | "completed" | "failed"
    }
    // ...更多交易
  ]
}
```

### 5.2. 申请提现

**Endpoint:** `POST /payments/withdraw`

**描述:** 用户申请提现。

**认证:** 需要

**请求体 (JSON):**
```json
{
  "amount": "number",
  "withdrawal_account_uuid": "string" // 提现到哪个账户
}
```

**成功响应 (200 OK):**
```json
{
  "message": "提现申请已提交",
  "transaction": { /* 提现交易详情 */ }
}
```

**错误响应:**
- 400 Bad Request: `{"error": "余额不足" / "无效的提现账户"}`

### 5.3. 添加提现账户

**Endpoint:** `POST /payments/withdrawal-accounts`

**描述:** 用户添加新的提现账户。

**认证:** 需要

**请求体 (JSON):**
```json
{
  "account_type": "alipay" | "wechatpay" | "bank_card",
  "account_holder_name": "string",
  "account_number": "string",
  "bank_name": "string" // (if bank_card)
}
```

**成功响应 (201 Created):**
```json
{
  "message": "提现账户添加成功",
  "account": { /* 新增的账户信息 */ }
}
```

## 6. 管理后台 (Admin)

### 6.1. 获取管理后台概览数据

**Endpoint:** `GET /admin/dashboard`

**描述:** 获取管理后台的概览数据。

**认证:** 需要 (管理员角色)

**成功响应 (200 OK):**
```json
{
  "total_users": 1248,
  "users_change_monthly": 124,
  "total_tasks": 356,
  "tasks_change_monthly": 42,
  "total_transaction_volume": 256890.00,
  "transaction_volume_change_monthly": 32450.00,
  "task_completion_rate": 92.4,
  "task_completion_rate_change_monthly": 2.1,
  "pending_tasks_count": 15,
  "pending_user_verifications_count": 5,
  "pending_withdrawals_count": 8,
  "pending_withdrawals_amount": 12500.00,
  "user_distribution": { "employer": 35, "worker": 65 }, // percentages
  "task_status_distribution": { "recruiting": 40, "in_progress": 30, /* ... */ },
  "popular_skills": [ { "name": "UI设计", "percentage": 24 }, /* ... */ ]
  // ...图表数据
}
```

> 其他 Admin 端点如用户管理列表、任务审核列表、交易列表等需要更详细的规格定义。 