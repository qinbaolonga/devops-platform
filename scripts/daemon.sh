#!/bin/bash
# DevOps Platform 守护进程脚本
# 定期检查服务状态，自动重启崩溃的服务

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_DIR="$PROJECT_DIR/frontend"
LOG_DIR="$PROJECT_DIR/logs"
PID_DIR="$PROJECT_DIR/pids"
DAEMON_PID_FILE="$PID_DIR/daemon.pid"
DAEMON_LOG="$LOG_DIR/daemon.log"

# 检查间隔（秒）
CHECK_INTERVAL=30

# 创建必要目录
mkdir -p "$LOG_DIR" "$PID_DIR"

# 日志函数
log() {
    local level=$1
    shift
    local message="$@"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] [$level] $message" >> "$DAEMON_LOG"
    echo -e "[$timestamp] [$level] $message"
}

# 检查后端服务
check_backend() {
    if [ -f "$PID_DIR/backend.pid" ]; then
        local pid=$(cat "$PID_DIR/backend.pid")
        if kill -0 "$pid" 2>/dev/null; then
            return 0
        fi
    fi
    return 1
}

# 启动后端服务
start_backend() {
    log "INFO" "启动后端服务..."
    cd "$BACKEND_DIR"
    nohup npm run start:prod >> "$LOG_DIR/backend.log" 2>&1 &
    echo $! > "$PID_DIR/backend.pid"
    sleep 3
    
    if check_backend; then
        log "INFO" "后端服务启动成功 (PID: $(cat $PID_DIR/backend.pid))"
        return 0
    else
        log "ERROR" "后端服务启动失败"
        return 1
    fi
}

# 检查前端服务（开发模式）
check_frontend() {
    if [ -f "$PID_DIR/frontend.pid" ]; then
        local pid=$(cat "$PID_DIR/frontend.pid")
        if kill -0 "$pid" 2>/dev/null; then
            return 0
        fi
    fi
    return 1
}

# 启动前端服务（开发模式）
start_frontend() {
    log "INFO" "启动前端服务..."
    cd "$FRONTEND_DIR"
    nohup npm run dev -- --host 0.0.0.0 >> "$LOG_DIR/frontend.log" 2>&1 &
    echo $! > "$PID_DIR/frontend.pid"
    sleep 3
    
    if check_frontend; then
        log "INFO" "前端服务启动成功 (PID: $(cat $PID_DIR/frontend.pid))"
        return 0
    else
        log "ERROR" "前端服务启动失败"
        return 1
    fi
}

# 健康检查
health_check() {
    # 检查后端 API
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/docs 2>/dev/null | grep -q "200\|301\|302"; then
        return 0
    fi
    return 1
}

# 守护进程主循环
daemon_loop() {
    log "INFO" "守护进程启动，检查间隔: ${CHECK_INTERVAL}秒"
    
    while true; do
        # 检查后端
        if ! check_backend; then
            log "WARN" "后端服务未运行，尝试重启..."
            start_backend
        fi
        
        # 检查前端（如果需要）
        if [ "${WATCH_FRONTEND:-false}" = "true" ]; then
            if ! check_frontend; then
                log "WARN" "前端服务未运行，尝试重启..."
                start_frontend
            fi
        fi
        
        # 健康检查
        if check_backend && ! health_check; then
            log "WARN" "后端服务健康检查失败，尝试重启..."
            # 停止旧进程
            if [ -f "$PID_DIR/backend.pid" ]; then
                kill $(cat "$PID_DIR/backend.pid") 2>/dev/null || true
                rm -f "$PID_DIR/backend.pid"
            fi
            sleep 2
            start_backend
        fi
        
        sleep $CHECK_INTERVAL
    done
}

# 启动守护进程
start_daemon() {
    if [ -f "$DAEMON_PID_FILE" ]; then
        local pid=$(cat "$DAEMON_PID_FILE")
        if kill -0 "$pid" 2>/dev/null; then
            echo -e "${YELLOW}守护进程已在运行 (PID: $pid)${NC}"
            exit 0
        fi
    fi
    
    echo -e "${BLUE}启动守护进程...${NC}"
    
    # 后台运行守护进程
    nohup bash -c "
        export PROJECT_DIR='$PROJECT_DIR'
        export BACKEND_DIR='$BACKEND_DIR'
        export FRONTEND_DIR='$FRONTEND_DIR'
        export LOG_DIR='$LOG_DIR'
        export PID_DIR='$PID_DIR'
        export DAEMON_LOG='$DAEMON_LOG'
        export CHECK_INTERVAL=$CHECK_INTERVAL
        export WATCH_FRONTEND=${WATCH_FRONTEND:-false}
        
        $(declare -f log check_backend start_backend check_frontend start_frontend health_check daemon_loop)
        
        daemon_loop
    " >> "$DAEMON_LOG" 2>&1 &
    
    echo $! > "$DAEMON_PID_FILE"
    echo -e "${GREEN}✓ 守护进程已启动 (PID: $(cat $DAEMON_PID_FILE))${NC}"
    echo -e "${BLUE}日志文件: $DAEMON_LOG${NC}"
}

# 停止守护进程
stop_daemon() {
    if [ -f "$DAEMON_PID_FILE" ]; then
        local pid=$(cat "$DAEMON_PID_FILE")
        if kill -0 "$pid" 2>/dev/null; then
            echo -e "${YELLOW}停止守护进程 (PID: $pid)...${NC}"
            kill "$pid" 2>/dev/null || true
            sleep 2
            kill -9 "$pid" 2>/dev/null || true
            rm -f "$DAEMON_PID_FILE"
            echo -e "${GREEN}✓ 守护进程已停止${NC}"
        else
            echo -e "${YELLOW}守护进程未运行${NC}"
            rm -f "$DAEMON_PID_FILE"
        fi
    else
        echo -e "${YELLOW}守护进程未运行${NC}"
    fi
}

# 查看状态
status_daemon() {
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}    服务状态${NC}"
    echo -e "${BLUE}========================================${NC}"
    
    if [ -f "$DAEMON_PID_FILE" ] && kill -0 $(cat "$DAEMON_PID_FILE") 2>/dev/null; then
        echo -e "${GREEN}✓ 守护进程: 运行中 (PID: $(cat $DAEMON_PID_FILE))${NC}"
    else
        echo -e "${RED}✗ 守护进程: 未运行${NC}"
    fi
    
    if check_backend; then
        echo -e "${GREEN}✓ 后端服务: 运行中 (PID: $(cat $PID_DIR/backend.pid))${NC}"
    else
        echo -e "${RED}✗ 后端服务: 未运行${NC}"
    fi
    
    if check_frontend; then
        echo -e "${GREEN}✓ 前端服务: 运行中 (PID: $(cat $PID_DIR/frontend.pid))${NC}"
    else
        echo -e "${YELLOW}○ 前端服务: 未运行${NC}"
    fi
    
    echo ""
    echo -e "${BLUE}日志文件:${NC}"
    echo "  守护进程: $DAEMON_LOG"
    echo "  后端日志: $LOG_DIR/backend.log"
    echo "  前端日志: $LOG_DIR/frontend.log"
}

# 主函数
main() {
    case "${1:-status}" in
        start)
            start_daemon
            ;;
        stop)
            stop_daemon
            ;;
        restart)
            stop_daemon
            sleep 2
            start_daemon
            ;;
        status)
            status_daemon
            ;;
        *)
            echo "用法: $0 {start|stop|restart|status}"
            echo ""
            echo "环境变量:"
            echo "  WATCH_FRONTEND=true  - 同时监控前端服务"
            echo "  CHECK_INTERVAL=30    - 检查间隔（秒）"
            exit 1
            ;;
    esac
}

main "$@"
