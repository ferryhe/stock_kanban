# 构建阶段
FROM node:22-alpine AS builder

WORKDIR /app

# 更新 npm 到最新版本
RUN npm install -g npm@latest

# 复制 package 文件
COPY package*.json ./
COPY tsconfig.json ./

# 安装依赖 (使用 ci 确保版本一致性)
RUN npm ci

# 复制源代码
COPY client ./client
COPY server ./server
COPY shared ./shared
COPY scripts ./scripts
COPY vite.config.ts vite-plugin-meta-images.ts ./
COPY data ./data

# 构建应用
RUN npm run build

# 生产阶段
FROM node:22-alpine

WORKDIR /app

# 更新生产环境的 npm
RUN npm install -g npm@latest

# 安装生产依赖
COPY package*.json ./
RUN npm ci --omit=dev

# 从构建阶段复制构建结果
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/data ./data

# 创建日志目录
RUN mkdir -p /app/logs

# 环境变量
ENV NODE_ENV=production
ENV PORT=3000

# 暴露端口
EXPOSE 3000

# 启动命令
CMD ["node", "dist/index.cjs"]
