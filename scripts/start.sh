#!/bin/bash
# DevOps Platform 启动脚本

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 项目根目录
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_DIR="$PROJECT_DIR/frontend"
LOG_DIR="$PROJECT_DIR/logs"
PID_DIR="$PROJECT_DIR/pids"

# 创建必要目录
mkdir -p "$LOG_DIR" "$PID_DIR"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}    DevOps Platform 启动脚本${NC}"
echo -e "${BLUE}========================================${NC}"

# 检查 Node.js
check_node() {
    if ! command -v node &> /dev/null; then
        echo -e "${RED}错误: Node.js 未安装${NC}"
        exit 1
    fi
    echo -e "${GREEN}✓ Node.js 版本: $(node -v)${NC}"
}

# 检查依赖
check_dependencies() {
    echo -e "${YELLOW}检查依赖...${NC}"
    
    if [ ! -d "$BACKEND_DIR/node_modules" ]; then
        echo -e "${YELLOW}安装后端依赖...${NC}"
        cd "$BACKEND_DIR" && npm install
    fi
    
    if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
        echo -e "${YELLOW}安装前端依赖...${NC}"
        cd "$FRONTEND_DIR" && npm install
    fi
    
    echo -e "${GREEN}✓ 依赖检查完成${NC}"
}

# 构建前端
build_frontend() {
    echo -e "${YELLOW}构建前端...${NC}"
    cd "$FRONTEND_DIR"
    npm run build
    echo -e "${GREEN}✓ 前端构建完成${NC}"
}

# 启动后端
start_backend() {
    echo -e "${YELLOW}启动后端服务...${NC}"
    cd "$BACKEND_DIR"
    
    # 检查是否已运行
    if [ -f "$PID_DIR/backend.pid" ]; then
        OLD_PID=$(cat "$PID_DIR/backend.pid")
        if kill -0 "$OLD_PID" 2>/dev/null; then
            echo -e "${YELLOW}后端服务已在运行 (PID: $OLD_PID)${NC}"
            return
        fi
    fi
    
    # 生产模式启动
    nohup npm run start:prod > "$LOG_DIR/backend.log" 2>&1 &
    echo $! > "$PID_DIR/backend.pid"
    
    sleep 3
    if kill -0 $(cat "$PID_DIR/backend.pid") 2>/dev/null; then
        echo -e "${GREEN}✓ 后端服务启动成功 (PID: $(cat $PID_DIR/backend.pid))${NC}"
    else
        echo -e "${RED}✗ 后端服务启动失败，请查看日志: $LOG_DIR/backend.log${NC}"
        exit 1
    fi
}

# 启动前端（开发模式）或使用 Nginx 托管静态文件
start_frontend_dev() {
    echo -e "${YELLOW}启动前端开发服务...${NC}"
    cd "$FRONTEND_DIR"
    
    if [ -f "$PID_DIR/frontend.pid" ]; then
        OLD_PID=$(cat "$PID_DIR/frontend.pid")
        if kill -0 "$OLD_PID" 2>/dev/null; then
            echo -e "${YELLOW}前端服务已在运行 (PID: $OLD_PID)${NC}"
            return
        fi
    fi
    
    nohup npm run dev -- --host 0.0.0.0 > "$LOG_DIR/frontend.log" 2>&1 &
    echo $! > "$PID_DIR/frontend.pid"
    
    sleep 3
    echo -e "${GREEN}✓ 前端开发服务启动成功 (PID: $(cat $PID_DIR/frontend.pid))${NC}"
}

# 显示状态
show_status() {
    echo ""
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}    服务状态${NC}"
    echo -e "${BLUE}========================================${NC}"
    
    if [ -f "$PID_DIR/backend.pid" ] && kill -0 $(cat "$PID_DIR/backend.pid") 2>/dev/null; then
        echo -e "${GREEN}✓ 后端服务: 运行中 (PID: $(cat $PID_DIR/backend.pid))${NC}"
    else
        echo -e "${RED}✗ 后端服务: 未运行${NC}"
    fi
    
    if [ -f "$PID_DIR/frontend.pid" ] && kill -0 $(cat "$PID_DIR/frontend.pid") 2>/dev/null; then
        echo -e "${GREEN}✓ 前端服务: 运行中 (PID: $(cat $PID_DIR/frontend.pid))${NC}"
    else
        echo -e "${YELLOW}○ 前端服务: 未运行 (生产环境使用 Nginx 托管)${NC}"
    fi
    
    echo ""
    echo -e "${BLUE}访问地址:${NC}"
    echo -e "  后端 API: http://localhost:3000"
    echo -e "  前端页面: http://localhost:3002 (开发模式)"
    echo -e "  HTTPS: https://your-domain.com (通过 Nginx)"
    echo ""
}

# 主函数
main() {
    case "${1:-all}" in
        backend)
            check_node
            start_backend
            ;;
        frontend)
            check_node
            start_frontend_dev
            ;;
        build)
            check_node
            check_dependencies
            build_frontend
            ;;
        all)
            check_node
            check_dependencies
            start_backend
            start_frontend_dev
            ;;
        prod)
            check_node
            check_dependencies
            build_frontend
            start_backend
            echo -e "${GREEN}生产模式启动完成，请配置 Nginx 托管前端静态文件${NC}"
            ;;
        *)
            echo "用法: $0 {all|backend|frontend|build|prod}"
            echo "  all      - 启动所有服务（开发模式）"
            echo "  backend  - 仅启动后端"
            echo "  frontend - 仅启动前端（开发模式）"
            echo "  build    - 构建前端"
            echo "  prod     - 生产模式（构建前端 + 启动后端）"
            exit 1
            ;;
    esac
    
    show_status
}

main "$@"
