# DevOps Platform

企业级 IT 运维自动化管理平台，提供主机管理、命令执行、Playbook 编排、定时任务、监控告警等功能。

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-green.svg)
![TypeScript](https://img.shields.io/badge/typescript-5.x-blue.svg)

## ✨ 功能特性

- 🖥️ **主机管理** - 批量导入、SSH 连接测试、信息采集
- 💻 **Web 终端** - 基于 xterm.js 的在线 SSH 终端
- 📁 **文件管理** - 远程文件浏览、上传、下载、编辑
- ⚡ **命令执行** - 批量命令执行、自定义快捷命令
- 📋 **Playbook** - Ansible Playbook 管理与执行
- ⏰ **定时任务** - Cron 表达式定时执行任务
- 📊 **监控中心** - 实时 CPU、内存、磁盘监控
- 🔔 **告警管理** - 自定义告警规则与通知
- 👥 **用户管理** - 多用户、角色权限控制
- 📝 **审计日志** - 完整的操作审计记录

## 🛠️ 技术栈

### 后端
- **框架**: NestJS
- **数据库**: MySQL + Prisma ORM
- **队列**: Bull (Redis)
- **认证**: JWT
- **SSH**: ssh2
- **WebSocket**: Socket.IO

### 前端
- **框架**: React 18 + TypeScript
- **UI**: Ant Design 5.x
- **状态管理**: Zustand
- **图表**: ECharts
- **终端**: xterm.js
- **构建**: Vite

## 📦 快速开始

### 环境要求

- Node.js >= 18.0.0
- MySQL >= 5.7
- Redis >= 6.0
- Ansible (可选，用于 Playbook 执行)

### 安装

```bash
# 克隆项目
git clone https://github.com/your-username/devops-platform.git
cd devops-platform

# 安装后端依赖
cd backend
npm install
cp .env.example .env  # 配置数据库连接

# 初始化数据库
npx prisma migrate deploy
npx prisma db seed

# 安装前端依赖
cd ../frontend
npm install
```

### 开发模式

```bash
# 启动后端 (端口 3000)
cd backend
npm run start:dev

# 启动前端 (端口 3002)
cd frontend
npm run dev
```

### 生产部署

```bash
# 使用部署脚本
sudo ./scripts/deploy.sh

# 或手动部署
cd frontend && npm run build
cd ../backend && npm run start:prod
```

## 🔧 配置

### 后端配置 (backend/.env)

```env
# 数据库
DATABASE_URL="mysql://user:password@localhost:3306/devops_platform"

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d

# 服务端口
PORT=3000
```

### Nginx HTTPS 配置

```bash
# 配置 SSL 证书
sudo ./scripts/nginx/setup-ssl.sh -d your-domain.com -m letsencrypt

# 复制 Nginx 配置
sudo cp scripts/nginx/devops.conf /etc/nginx/conf.d/
sudo nginx -s reload
```

## 📖 API 文档

启动后端后访问 Swagger 文档：
- http://localhost:3000/api/docs

## 🖼️ 截图

<details>
<summary>点击查看截图</summary>

### 登录页面
科技感十足的登录界面，支持验证码
<img width="1980" height="1008" alt="image" src="https://github.com/user-attachments/assets/075beadb-8073-4842-8d7a-5ffbb376f90d" />


### 监控中心
实时监控主机 CPU、内存、磁盘使用情况
<img width="2199" height="1107" alt="image" src="https://github.com/user-attachments/assets/93db7036-0cd6-4b5a-aab4-99b53944ab53" />

### 主机管理
批量管理服务器，支持 Excel 导入导出
<img width="2217" height="1122" alt="image" src="https://github.com/user-attachments/assets/f8189240-d0fe-49bf-85d9-7caf15c18b5b" />

### Web 终端
在线 SSH 终端，支持多标签页
<img width="2175" height="1041" alt="image" src="https://github.com/user-attachments/assets/54457971-3195-4e29-b2dc-14de6b39ae85" />

### 命令执行
批量执行命令，支持自定义快捷命令
<img width="2210" height="1116" alt="image" src="https://github.com/user-attachments/assets/2abc06e9-c67c-4bc3-97f3-70346c6124b0" />

</details>

## 📁 项目结构

```
devops-platform/
├── backend/                 # 后端代码
│   ├── src/
│   │   ├── auth/           # 认证模块
│   │   ├── hosts/          # 主机管理
│   │   ├── commands/       # 命令执行
│   │   ├── playbooks/      # Playbook 管理
│   │   ├── tasks/          # 任务管理
│   │   ├── monitoring/     # 监控模块
│   │   ├── alerts/         # 告警模块
│   │   └── ...
│   └── prisma/             # 数据库模型
├── frontend/               # 前端代码
│   ├── src/
│   │   ├── components/     # 公共组件
│   │   ├── pages/          # 页面组件
│   │   ├── stores/         # 状态管理
│   │   └── utils/          # 工具函数
│   └── ...
├── scripts/                # 部署脚本
│   ├── start.sh           # 启动脚本
│   ├── stop.sh            # 停止脚本
│   ├── daemon.sh          # 守护进程
│   ├── deploy.sh          # 部署脚本
│   └── nginx/             # Nginx 配置
└── docker-compose.yml     # Docker 编排
```

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

[MIT License](LICENSE)

## 🙏 致谢

- [NestJS](https://nestjs.com/)
- [React](https://reactjs.org/)
- [Ant Design](https://ant.design/)
- [xterm.js](https://xtermjs.org/)
