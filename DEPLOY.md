# Docker 部署指南

## 快速部署

### 1. 準備環境變數
```bash
# 複製並編輯環境變數
cp .env.production .env

# 生成 JWT 密鑰
echo "JWT_SECRET=$(openssl rand -base64 32)" >> .env
```

### 2. 構建並啟動
```bash
# 構建鏡像
docker-compose build

# 啟動服務
docker-compose up -d

# 查看日誌
docker-compose logs -f
```

### 3. 初始化資料庫（首次部署）
```bash
docker-compose exec backend npm run init-db
docker-compose exec backend npm run seed
```

### 4. 訪問應用
- 前端: http://your-server-ip
- API: http://your-server-ip/api
- 健康檢查: http://your-server-ip/health

---

## 常用命令

```bash
# 停止服務
docker-compose down

# 重新構建並啟動
docker-compose up -d --build

# 查看容器狀態
docker-compose ps

# 查看後端日誌
docker-compose logs -f backend

# 進入後端容器
docker-compose exec backend sh

# 備份資料庫
cp ./data/database/blue-earth-watch.db ./backup/
```

---

## HTTPS 配置（可選）

如需 HTTPS，建議使用 Nginx Proxy Manager 或 Traefik。

### 使用 Nginx Proxy Manager
1. 部署 Nginx Proxy Manager
2. 添加 Proxy Host 指向 `bew-frontend:80`
3. 啟用 SSL 證書

### 修改 docker-compose.yml 加入外部網絡
```yaml
services:
  frontend:
    # 移除 ports 映射
    networks:
      - bew-network
      - proxy-network  # 外部代理網絡

networks:
  proxy-network:
    external: true
```

---

## 故障排除

### 資料庫權限問題
```bash
sudo chown -R 1000:1000 ./data/database
```

### 容器無法啟動
```bash
docker-compose logs backend
docker-compose logs frontend
```

### 重置所有數據
```bash
docker-compose down -v
rm -rf ./data/database/*
docker-compose up -d
docker-compose exec backend npm run init-db
docker-compose exec backend npm run seed
```
