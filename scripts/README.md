# DevOps Platform 部署脚本

## 脚本说明

| 脚本 | 说明 |
|------|------|
| `start.sh` | 启动服务 |
| `stop.sh` | 停止服务 |
| `daemon.sh` | 守护进程（自动重启崩溃的服务） |
| `deploy.sh` | 一键部署到生产环境 |
| `nginx/devops.conf` | Nginx 配置文件 |
| `nginx/setup-ssl.sh` | SSL 证书配置脚本 |

## 快速开始

### 开发环境

```bash
# 启动所有服务
./scripts/start.sh

# 仅启动后端
./scripts/start.sh backend

# 仅启动前端
./scripts/start.sh frontend

# 停止所有服务
./scripts/stop.sh
```

### 生产环境部署

```bash
# 一键部署（需要 root 权限）
sudo ./scripts/deploy.sh

# 或分步执行
sudo ./scripts/deploy.sh deps     # 安装依赖
sudo ./scripts/deploy.sh app      # 部署应用
sudo ./scripts/deploy.sh nginx    # 配置 Nginx
sudo ./scripts/deploy.sh systemd  # 配置 systemd
```

### 守护进程

```bash
# 启动守护进程
./scripts/daemon.sh start

# 停止守护进程
./scripts/daemon.sh stop

# 查看状态
./scripts/daemon.sh status

# 同时监控前端服务
WATCH_FRONTEND=true ./scripts/daemon.sh start
```

### SSL 证书配置

```bash
# Let's Encrypt 自动证书（推荐）
sudo ./scripts/nginx/setup-ssl.sh -d your-domain.com -e admin@example.com -m letsencrypt

# 自签名证书（测试用）
sudo ./scripts/nginx/setup-ssl.sh -d your-domain.com -m self-signed

# 手动证书
sudo ./scripts/nginx/setup-ssl.sh -d your-domain.com -m manual
```

## Nginx 配置

### 手动配置步骤

1. 复制配置文件：
```bash
sudo cp scripts/nginx/devops.conf /etc/nginx/conf.d/
```

2. 修改域名：
```bash
sudo sed -i 's/your-domain.com/实际域名/g' /etc/nginx/conf.d/devops.conf
```

3. 配置 SSL 证书路径

4. 测试并重载：
```bash
sudo nginx -t
sudo nginx -s reload
```

### 配置说明

- 前端静态文件：`/var/www/devops/frontend/dist`
- 后端 API 代理：`http://127.0.0.1:3000`
- WebSocket 代理：支持终端和 Socket.IO

## 服务管理

### systemd 命令

```bash
# 启动
sudo systemctl start devops-backend

# 停止
sudo systemctl stop devops-backend

# 重启
sudo systemctl restart devops-backend

# 查看状态
sudo systemctl status devops-backend

# 查看日志
sudo journalctl -u devops-backend -f
```

## 日志位置

| 日志 | 路径 |
|------|------|
| 后端日志 | `logs/backend.log` |
| 前端日志 | `logs/frontend.log` |
| 守护进程日志 | `logs/daemon.log` |
| Nginx 访问日志 | `/var/log/nginx/devops_access.log` |
| Nginx 错误日志 | `/var/log/nginx/devops_error.log` |

## 端口说明

| 服务 | 端口 |
|------|------|
| 后端 API | 3000 |
| 前端开发服务 | 3002 |
| HTTP | 80 |
| HTTPS | 443 |

## 注意事项

1. 生产环境建议使用 HTTPS
2. 确保防火墙开放 80 和 443 端口
3. 定期备份数据库
4. 监控服务状态和日志
