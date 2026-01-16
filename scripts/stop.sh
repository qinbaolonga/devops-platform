#!/bin/bash
# DevOps Platform 停止脚本

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PID_DIR="$PROJECT_DIR/pids"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}    DevOps Platform 停止脚本${NC}"
echo -e "${BLUE}========================================${NC}"

# 停止后端
stop_backend() {
    if [ -f "$PID_DIR/backend.pid" ]; then
        PID=$(cat "$PID_DIR/backend.pid")
        if kill -0 "$PID" 2>/dev/null; then
            echo -e "${YELLOW}停止后端服务 (PID: $PID)...${NC}"
            kill "$PID" 2>/dev/null || true
            sleep 2
            # 强制杀死
            kill -9 "$PID" 2>/dev/null || true
            echo -e "${GREEN}✓ 后端服务已停止${NC}"
        else
            echo -e "${YELLOW}后端服务未运行${NC}"
        fi
        rm -f "$PID_DIR/backend.pid"
    else
        echo -e "${YELLOW}后端服务未运行${NC}"
    fi
}

# 停止前端
stop_frontend() {
    if [ -f "$PID_DIR/frontend.pid" ]; then
        PID=$(cat "$PID_DIR/frontend.pid")
        if kill -0 "$PID" 2>/dev/null; then
            echo -e "${YELLOW}停止前端服务 (PID: $PID)...${NC}"
            kill "$PID" 2>/dev/null || true
            sleep 2
            kill -9 "$PID" 2>/dev/null || true
            echo -e "${GREEN}✓ 前端服务已停止${NC}"
        else
            echo -e "${YELLOW}前端服务未运行${NC}"
        fi
        rm -f "$PID_DIR/frontend.pid"
    else
        echo -e "${YELLOW}前端服务未运行${NC}"
    fi
}

# 主函数
main() {
    case "${1:-all}" in
        backend)
            stop_backend
            ;;
        frontend)
            stop_frontend
            ;;
        all)
            stop_backend
            stop_frontend
            ;;
        *)
            echo "用法: $0 {all|backend|frontend}"
            exit 1
            ;;
    esac
    
    echo -e "${GREEN}停止完成${NC}"
}

main "$@"
