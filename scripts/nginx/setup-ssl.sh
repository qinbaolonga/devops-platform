#!/bin/bash
# SSL 证书配置脚本
# 支持 Let's Encrypt 自动证书或手动证书

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

DOMAIN=""
EMAIL=""
SSL_DIR="/etc/nginx/ssl"
CERTBOT_WEBROOT="/var/www/certbot"

usage() {
    echo "用法: $0 -d <域名> [-e <邮箱>] [-m <模式>]"
    echo ""
    echo "选项:"
    echo "  -d <域名>    你的域名（必需）"
    echo "  -e <邮箱>    Let's Encrypt 通知邮箱"
    echo "  -m <模式>    证书模式: letsencrypt | self-signed | manual"
    echo ""
    echo "示例:"
    echo "  $0 -d example.com -e admin@example.com -m letsencrypt"
    echo "  $0 -d example.com -m self-signed"
    exit 1
}

while getopts "d:e:m:h" opt; do
    case $opt in
        d) DOMAIN="$OPTARG" ;;
        e) EMAIL="$OPTARG" ;;
        m) MODE="$OPTARG" ;;
        h) usage ;;
        *) usage ;;
    esac
done

if [ -z "$DOMAIN" ]; then
    echo -e "${RED}错误: 请指定域名${NC}"
    usage
fi

MODE="${MODE:-self-signed}"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}    SSL 证书配置${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "域名: $DOMAIN"
echo -e "模式: $MODE"
echo ""

# 创建 SSL 目录
mkdir -p "$SSL_DIR"

case "$MODE" in
    letsencrypt)
        if [ -z "$EMAIL" ]; then
            echo -e "${RED}错误: Let's Encrypt 需要邮箱地址${NC}"
            exit 1
        fi
        
        echo -e "${YELLOW}安装 Certbot...${NC}"
        if command -v apt-get &> /dev/null; then
            apt-get update
            apt-get install -y certbot python3-certbot-nginx
        elif command -v yum &> /dev/null; then
            yum install -y certbot python3-certbot-nginx
        fi
        
        echo -e "${YELLOW}申请 Let's Encrypt 证书...${NC}"
        mkdir -p "$CERTBOT_WEBROOT"
        
        certbot certonly --webroot \
            -w "$CERTBOT_WEBROOT" \
            -d "$DOMAIN" \
            --email "$EMAIL" \
            --agree-tos \
            --non-interactive
        
        # 创建符号链接
        ln -sf "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" "$SSL_DIR/$DOMAIN.crt"
        ln -sf "/etc/letsencrypt/live/$DOMAIN/privkey.pem" "$SSL_DIR/$DOMAIN.key"
        
        # 设置自动续期
        echo "0 0,12 * * * root certbot renew --quiet && nginx -s reload" > /etc/cron.d/certbot-renew
        
        echo -e "${GREEN}✓ Let's Encrypt 证书配置完成${NC}"
        ;;
        
    self-signed)
        echo -e "${YELLOW}生成自签名证书...${NC}"
        
        openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
            -keyout "$SSL_DIR/$DOMAIN.key" \
            -out "$SSL_DIR/$DOMAIN.crt" \
            -subj "/C=CN/ST=Beijing/L=Beijing/O=DevOps/CN=$DOMAIN"
        
        echo -e "${GREEN}✓ 自签名证书生成完成${NC}"
        echo -e "${YELLOW}注意: 自签名证书会导致浏览器安全警告${NC}"
        ;;
        
    manual)
        echo -e "${YELLOW}手动证书模式${NC}"
        echo ""
        echo "请将你的证书文件放置到以下位置:"
        echo "  证书文件: $SSL_DIR/$DOMAIN.crt"
        echo "  私钥文件: $SSL_DIR/$DOMAIN.key"
        echo ""
        echo "然后运行: nginx -t && nginx -s reload"
        exit 0
        ;;
        
    *)
        echo -e "${RED}错误: 未知模式 $MODE${NC}"
        usage
        ;;
esac

# 更新 Nginx 配置
NGINX_CONF="/etc/nginx/conf.d/devops.conf"
if [ -f "$NGINX_CONF" ]; then
    echo -e "${YELLOW}更新 Nginx 配置...${NC}"
    sed -i "s/your-domain.com/$DOMAIN/g" "$NGINX_CONF"
    sed -i "s|/etc/nginx/ssl/your-domain.com.crt|$SSL_DIR/$DOMAIN.crt|g" "$NGINX_CONF"
    sed -i "s|/etc/nginx/ssl/your-domain.com.key|$SSL_DIR/$DOMAIN.key|g" "$NGINX_CONF"
fi

# 测试 Nginx 配置
echo -e "${YELLOW}测试 Nginx 配置...${NC}"
nginx -t

# 重载 Nginx
echo -e "${YELLOW}重载 Nginx...${NC}"
nginx -s reload || systemctl reload nginx

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}    配置完成！${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "证书位置:"
echo -e "  证书: $SSL_DIR/$DOMAIN.crt"
echo -e "  私钥: $SSL_DIR/$DOMAIN.key"
echo ""
echo -e "访问地址: https://$DOMAIN"
