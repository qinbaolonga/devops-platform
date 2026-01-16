#!/bin/bash
# DevOps Platform 一键部署脚本

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
DEPLOY_DIR="/var/www/devops"
NGINX_CONF_DIR="/etc/nginx/conf.d"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}    DevOps Platform 部署脚本${NC}"
echo -e "${BLUE}========================================${NC}"

# 检查 root 权限
check_root() {
    if [ "$EUID" -ne 0 ]; then
        echo -e "${RED}请使用 root 权限运行此脚本${NC}"
        echo "sudo $0 $@"
        exit 1
    fi
}

# 安装依赖
install_dependencies() {
    echo -e "${YELLOW}安装系统依赖...${NC}"
    
    if command -v apt-get &> /dev/null; then
        apt-get update
        apt-get install -y nginx nodejs npm
    elif command -v yum &> /dev/null; then
        yum install -y epel-release
        yum install -y nginx nodejs npm
    fi
    
    # 安装 PM2（可选，用于进程管理）
    npm install -g pm2 2>/dev/null || true
    
    echo -e "${GREEN}✓ 依赖安装完成${NC}"
}

# 部署应用
deploy_app() {
    echo -e "${YELLOW}部署应用...${NC}"
    
    # 创建部署目录
    mkdir -p "$DEPLOY_DIR"
    
    # 复制项目文件
    rsync -av --exclude='node_modules' --exclude='.git' --exclude='logs' --exclude='pids' \
        "$PROJECT_DIR/" "$DEPLOY_DIR/"
    
    # 安装依赖
    cd "$DEPLOY_DIR/backend"
    npm install --production
    npm run build 2>/dev/null || true
    
    cd "$DEPLOY_DIR/frontend"
    npm install
    npm run build
    
    echo -e "${GREEN}✓ 应用部署完成${NC}"
}

# 配置 Nginx
setup_nginx() {
    echo -e "${YELLOW}配置 Nginx...${NC}"
    
    # 复制 Nginx 配置
    cp "$PROJECT_DIR/scripts/nginx/devops.conf" "$NGINX_CONF_DIR/"
    
    # 更新配置中的路径
    sed -i "s|/var/www/devops|$DEPLOY_DIR|g" "$NGINX_CONF_DIR/devops.conf"
    
    # 测试配置
    nginx -t
    
    # 重启 Nginx
    systemctl enable nginx
    systemctl restart nginx
    
    echo -e "${GREEN}✓ Nginx 配置完成${NC}"
}

# 配置 systemd 服务
setup_systemd() {
    echo -e "${YELLOW}配置 systemd 服务...${NC}"
    
    cat > /etc/systemd/system/devops-backend.service << EOF
[Unit]
Description=DevOps Platform Backend
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=$DEPLOY_DIR/backend
ExecStart=/usr/bin/npm run start:prod
Restart=always
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=devops-backend
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

    systemctl daemon-reload
    systemctl enable devops-backend
    systemctl start devops-backend
    
    echo -e "${GREEN}✓ systemd 服务配置完成${NC}"
}

# 显示部署信息
show_info() {
    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}    部署完成！${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""
    echo -e "部署目录: $DEPLOY_DIR"
    echo ""
    echo -e "${BLUE}服务管理命令:${NC}"
    echo "  启动后端: systemctl start devops-backend"
    echo "  停止后端: systemctl stop devops-backend"
    echo "  重启后端: systemctl restart devops-backend"
    echo "  查看状态: systemctl status devops-backend"
    echo "  查看日志: journalctl -u devops-backend -f"
    echo ""
    echo -e "${BLUE}下一步:${NC}"
    echo "  1. 修改 Nginx 配置中的域名: vim $NGINX_CONF_DIR/devops.conf"
    echo "  2. 配置 SSL 证书: $PROJECT_DIR/scripts/nginx/setup-ssl.sh -d your-domain.com -m letsencrypt"
    echo "  3. 重载 Nginx: nginx -s reload"
    echo ""
    echo -e "${YELLOW}访问地址:${NC}"
    echo "  HTTP:  http://your-server-ip"
    echo "  HTTPS: https://your-domain.com (配置 SSL 后)"
}

# 主函数
main() {
    check_root
    
    case "${1:-full}" in
        deps)
            install_dependencies
            ;;
        app)
            deploy_app
            ;;
        nginx)
            setup_nginx
            ;;
        systemd)
            setup_systemd
            ;;
        full)
            install_dependencies
            deploy_app
            setup_nginx
            setup_systemd
            show_info
            ;;
        *)
            echo "用法: $0 {full|deps|app|nginx|systemd}"
            echo ""
            echo "  full    - 完整部署（默认）"
            echo "  deps    - 仅安装依赖"
            echo "  app     - 仅部署应用"
            echo "  nginx   - 仅配置 Nginx"
            echo "  systemd - 仅配置 systemd 服务"
            exit 1
            ;;
    esac
}

main "$@"
