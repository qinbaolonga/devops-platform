# 部署指南

## 当前状态

项目结构和配置文件已创建完成，包括：

✅ 项目文档 (README.md)
✅ 环境配置模板 (.env.example)
✅ Docker 配置 (docker-compose.yml)
✅ 后端配置文件 (package.json, tsconfig.json, Prisma Schema)
✅ Git 配置 (.gitignore)

## 部署步骤

### 前提条件

确保你的服务器已安装：
- Node.js >= 20.0.0
- npm >= 10.0.0
- MySQL >= 8.0 (已配置，端口 60331)
- Redis >= 7.0
- Python >= 3.8
- Ansible >= 2.14
- Git

### 步骤 1: 安装 Node.js 20 LTS

```bash
# CentOS/RHEL
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo yum install -y nodejs

# 验证安装
node --version  # 应该显示 v20.x.x
npm --version   # 应该显示 10.x.x
```

### 步骤 2: 安装 Python 和 Ansible

```bash
# 安装 Python 3
sudo yum install -y python3 python3-pip

# 安装 Ansible
pip3 install --user ansible

# 验证安装
ansible --version
```

### 步骤 3: 安装和配置 Redis

```bash
# 安装 Redis
sudo yum install -y redis

# 启动 Redis
sudo systemctl start redis
sudo systemctl enable redis

# 验证 Redis
redis-cli ping  # 应该返回 PONG
```

### 步骤 4: 配置 MySQL 数据库

你的 MySQL 已经在端口 60331 运行，现在创建数据库：

```bash
# 连接到 MySQL
mysql -h localhost -P 60331 -u evaadmin -p

# 输入密码: evaDKS579<>?

# 创建数据库
CREATE DATABASE IF NOT EXISTS devops_platform CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# 验证
SHOW DATABASES;
USE devops_platform;

# 退出
EXIT;
```

### 步骤 5: 配置环境变量

```bash
# 复制环境变量模板
cp .env.example .env

# 编辑配置文件
vi .env

# 必须修改的配置：
# - JWT_SECRET: 生成一个随机的 32 字符密钥
# - ENCRYPTION_KEY: 生成一个随机的 32 字符密钥
# - SMTP_* : 如果需要邮件通知，配置 SMTP 服务器

# 生成随机密钥的命令：
openssl rand -base64 32
```

### 步骤 6: 安装后端依赖

```bash
cd backend

# 安装依赖（这可能需要几分钟）
npm install

# 生成 Prisma Client
npx prisma generate
```

### 步骤 7: 初始化数据库

```bash
# 在 backend 目录下

# 运行数据库迁移
npx prisma migrate deploy

# 创建初始数据（管理员账户等）
npx prisma db seed
```

### 步骤 8: 安装前端依赖

```bash
cd ../frontend

# 安装依赖
npm install
```

### 步骤 9: 启动开发服务器

```bash
# 启动后端（在一个终端）
cd backend
npm run start:dev

# 启动前端（在另一个终端）
cd frontend
npm run dev
```

### 步骤 10: 访问系统

打开浏览器访问：
- 前端: http://localhost:5173
- 后端 API: http://localhost:3000
- API 文档: http://localhost:3000/api/docs

默认管理员账户：
- 用户名: `admin`
- 密码: `admin123`

**重要：首次登录后立即修改密码！**

## 生产环境部署

### 使用 Docker Compose（推荐）

```bash
# 1. 配置环境变量
cp .env.example .env
vi .env

# 2. 构建并启动所有服务
docker-compose up -d

# 3. 查看日志
docker-compose logs -f

# 4. 访问系统
# http://your-server-ip
```

### 使用 PM2 部署

```bash
# 安装 PM2
npm install -g pm2

# 构建后端
cd backend
npm run build

# 启动后端
pm2 start dist/main.js --name devops-backend

# 构建前端
cd ../frontend
npm run build

# 使用 Nginx 托管前端静态文件
sudo cp -r dist/* /var/www/html/
```

## 故障排查

### 问题 1: 数据库连接失败

```bash
# 检查 MySQL 是否运行
sudo systemctl status mysqld

# 检查端口是否监听
netstat -tlnp | grep 60331

# 测试连接
mysql -h localhost -P 60331 -u evaadmin -p
```

### 问题 2: Redis 连接失败

```bash
# 检查 Redis 状态
sudo systemctl status redis

# 测试连接
redis-cli ping
```

### 问题 3: Ansible 命令执行失败

```bash
# 检查 Ansible 安装
ansible --version

# 测试 SSH 连接
ssh root@target-host

# 生成 SSH 密钥（如果没有）
ssh-keygen -t ed25519
```

### 问题 4: 端口被占用

```bash
# 检查端口占用
netstat -tlnp | grep 3000  # 后端
netstat -tlnp | grep 5173  # 前端

# 杀死占用端口的进程
kill -9 <PID>
```

### 问题 5: npm install 失败

```bash
# 清理缓存
npm cache clean --force

# 删除 node_modules 重新安装
rm -rf node_modules package-lock.json
npm install
```

## 下一步

完成部署后，你需要：

1. ✅ 修改默认管理员密码
2. ✅ 创建项目和用户
3. ✅ 添加主机
4. ✅ 配置告警通知渠道
5. ✅ 测试核心功能

## 开发继续

当前已完成：
- ✅ 项目结构搭建
- ✅ 配置文件创建
- ✅ 数据库 Schema 设计

待完成（需要 Node.js 环境）：
- ⏳ 后端代码实现（42 个任务）
- ⏳ 前端代码实现
- ⏳ 测试编写
- ⏳ 功能集成

**注意：** 由于当前环境没有 Node.js，无法继续开发。请在有 Node.js 环境的机器上继续执行后续任务。

## 联系支持

如有问题，请查看：
- README.md - 项目文档
- .kiro/specs/enterprise-devops-platform/ - 完整的需求、设计和任务文档
