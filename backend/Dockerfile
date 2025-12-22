FROM node:18-alpine

# 安裝 better-sqlite3 所需的編譯工具
RUN apk add --no-cache python3 make g++

WORKDIR /app

# 複製 package 文件
COPY package*.json ./

# 安裝所有依賴（包括 devDependencies 用於初始化腳本）
RUN npm ci

# 複製源代碼
COPY . .

# 創建資料庫目錄並設置權限
RUN mkdir -p /app/database && chown -R node:node /app

# 設置環境變數
ENV NODE_ENV=production
ENV PORT=3000
ENV DATABASE_PATH=/app/database/blue-earth-watch.db

EXPOSE 3000

# 創建啟動腳本
RUN echo '#!/bin/sh' > /app/start.sh && \
    echo 'set -e' >> /app/start.sh && \
    echo 'if [ ! -f "$DATABASE_PATH" ]; then' >> /app/start.sh && \
    echo '  echo "Initializing database..."' >> /app/start.sh && \
    echo '  node src/database/init.js' >> /app/start.sh && \
    echo '  echo "Seeding data..."' >> /app/start.sh && \
    echo '  node src/database/seed.js' >> /app/start.sh && \
    echo '  echo "Syncing external data..."' >> /app/start.sh && \
    echo '  node src/scripts/syncData.js || true' >> /app/start.sh && \
    echo 'fi' >> /app/start.sh && \
    echo 'exec node src/app.js' >> /app/start.sh && \
    chmod +x /app/start.sh

# 使用非 root 用戶運行
USER node

# 啟動命令
CMD ["/app/start.sh"]
