#!/bin/bash

echo "🚀 启动企业级DevOps运维管理平台后端服务"
echo "=========================================="

# 检查Node.js版本
echo "📋 检查环境..."
node_version=$(node -v)
echo "Node.js版本: $node_version"

# 进入后端目录
cd backend

# 检查.env文件
if [ ! -f ".env" ]; then
    echo "⚠️  .env文件不存在，正在创建..."
    cp ../.env.example .env
    echo "✅ .env文件已创建，请根据需要修改配置"
fi

# 安装依赖
echo "📦 安装依赖..."
npm install

# 生成Prisma客户端
echo "🔧 生成Prisma客户端..."
npx prisma generate

# 运行数据库迁移
echo "🗄️  运行数据库迁移..."
npx prisma migrate deploy

# 运行种子数据
echo "🌱 运行种子数据..."
npx prisma db seed

# 启动开发服务器
echo "🚀 启动开发服务器..."
echo "后端地址: http://localhost:3000"
echo "API文档: http://localhost:3000/api/docs"
echo "默认管理员: admin / admin123456"
echo ""

npm run start:dev