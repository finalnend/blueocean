FROM node:18-alpine

# 安裝 better-sqlite3 所需的編譯工具
RUN apk add --no-cache python3 make g++

WORKDIR /app

# 複製 package 文件
COPY package*.json ./

# 安裝依賴
RUN npm ci --only=production

# 複製源代碼
COPY . .

# 創建資料庫目錄
RUN mkdir -p /app/database

# 設置環境變數
ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

# 啟動命令
CMD ["node", "src/app.js"]
