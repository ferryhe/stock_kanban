# 构建阶段
FROM node:22-alpine AS builder

WORKDIR /app

# 复制 package 文件
COPY package*.json ./
COPY tsconfig.json ./

# 安装依赖
RUN npm ci

# 复制源代码
COPY client ./client
COPY server ./server
COPY shared ./shared
COPY script ./script
COPY vite.config.ts vite-plugin-meta-images.ts ./
COPY data ./data

# 构建应用
RUN npm run build

# 生产阶段
FROM node:22-alpine

WORKDIR /app

# 安装生产依赖
COPY package*.json ./
RUN npm ci --omit=dev

# 从构建阶段复制构建结果
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/data ./data

# 创建日志目录
RUN mkdir -p /app/logs

# 暴露端口
EXPOSE 3000

# 启动命令
CMD ["node", "dist/index.cjs"]
