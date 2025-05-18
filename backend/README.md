# 智慧零工平台后端

本目录包含智慧零工平台的后端代码和文档。

## 技术栈

- **语言**: Go
- **Web框架**: Gin
- **ORM**: GORM
- **数据库**: MySQL
- **认证**: JWT

## 项目结构

```
backend/
├── api/              # API路由和控制器
│   ├── handlers/     # 请求处理器
│   ├── middlewares/  # 中间件
│   └── routes/       # 路由定义
├── config/           # 配置文件
├── db/               # 数据库相关
│   ├── migrations/   # 数据库迁移
│   └── schema.sql    # 数据库结构SQL
├── docs/             # 文档
│   └── api.md        # API接口文档
├── models/           # 数据模型
├── services/         # 业务逻辑
├── utils/            # 工具函数
└── main.go           # 应用入口
```

## 快速开始

1. **安装依赖**

确保已安装Go (1.16+)和MySQL (5.7+)

```bash
go mod download
```

2. **配置数据库**

创建MySQL数据库并执行`db/schema.sql`初始化表结构

```bash
mysql -u root -p < db/schema.sql
```

3. **配置环境变量**

创建`.env`文件:

```
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=yourpassword
DB_NAME=gigplatform
JWT_SECRET=your-secret-key
SERVER_PORT=8080
```

4. **运行服务**

```bash
go run main.go
```

服务将在`http://localhost:8080`运行

## API文档

详细的API文档请查看[docs/api.md](docs/api.md)。

## 数据库结构

数据库结构SQL文件位于[db/schema.sql](db/schema.sql)。

## 开发规范

- 遵循Go的标准项目布局
- 代码风格参考[Go Code Review Comments](https://github.com/golang/go/wiki/CodeReviewComments)
- 使用依赖注入管理服务依赖
- 使用事务处理数据一致性
- 所有敏感数据加密存储

## 测试

运行测试:

```bash
go test ./...
```

运行覆盖率测试:

```bash
go test -cover ./...
``` 