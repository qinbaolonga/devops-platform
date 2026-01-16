#!/bin/bash

echo "🚀 启动企业级DevOps运维管理平台前端服务"
echo "=========================================="

# 检查Node.js版本
echo "📋 检查环境..."
node_version=$(node -v)
echo "Node.js版本: $node_version"

# 进入前端目录
cd frontend

# 安装依赖
echo "📦 安装依赖..."
npm install

# 启动开发服务器
echo "🚀 启动开发服务器..."
echo "前端地址: http://localhost:3002"
echo "默认管理员: admin / admin123456"
echo ""

npm run dev