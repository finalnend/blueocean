#!/bin/bash

# Blue Earth Watch - Linux/macOS 啟動腳本
# 使用方法: chmod +x start.sh && ./start.sh

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}================================${NC}"
echo -e "${CYAN}  Blue Earth Watch Launcher${NC}"
echo -e "${CYAN}================================${NC}"
echo ""

# 檢查 Node.js
echo -e "${YELLOW}檢查環境...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${RED}✗ 找不到 Node.js！請先安裝 Node.js 18 或更高版本${NC}"
    echo -e "${YELLOW}下載連結: https://nodejs.org/${NC}"
    exit 1
fi

NODE_VERSION=$(node --version)
echo -e "${GREEN}✓ Node.js 版本: $NODE_VERSION${NC}"

# 取得專案根目錄
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
BACKEND_PATH="$SCRIPT_DIR/backend"
FRONTEND_PATH="$SCRIPT_DIR/frontend"

# 檢查資料夾
if [ ! -d "$BACKEND_PATH" ]; then
    echo -e "${RED}✗ 找不到後端資料夾: $BACKEND_PATH${NC}"
    exit 1
fi

if [ ! -d "$FRONTEND_PATH" ]; then
    echo -e "${RED}✗ 找不到前端資料夾: $FRONTEND_PATH${NC}"
    exit 1
fi

echo ""
echo -e "${CYAN}選擇啟動模式：${NC}"
echo -e "${NC}1. 完整啟動（前端 + 後端）${NC}"
echo -e "${NC}2. 只啟動後端${NC}"
echo -e "${NC}3. 只啟動前端${NC}"
echo -e "${NC}4. 初始化專案（首次使用）${NC}"
echo -e "${NC}5. 同步外部資料${NC}"
echo -e "${NC}6. 退出${NC}"
echo ""

read -p "請輸入選項 (1-6): " choice

case $choice in
    1)
        echo ""
        echo -e "${GREEN}正在啟動完整服務...${NC}"
        echo ""
        
        # 啟動後端
        echo -e "${YELLOW}啟動後端服務器...${NC}"
        cd "$BACKEND_PATH"
        gnome-terminal -- bash -c "echo -e '${CYAN}後端服務器啟動中...${NC}'; npm run dev; exec bash" 2>/dev/null || \
        osascript -e 'tell app "Terminal" to do script "cd '"$BACKEND_PATH"' && echo \"後端服務器啟動中...\" && npm run dev"' 2>/dev/null || \
        xterm -e "cd $BACKEND_PATH && npm run dev" 2>/dev/null &
        
        # 等待 3 秒
        sleep 3
        
        # 啟動前端
        echo -e "${YELLOW}啟動前端開發服務器...${NC}"
        cd "$FRONTEND_PATH"
        gnome-terminal -- bash -c "echo -e '${CYAN}前端服務器啟動中...${NC}'; npm run dev; exec bash" 2>/dev/null || \
        osascript -e 'tell app "Terminal" to do script "cd '"$FRONTEND_PATH"' && echo \"前端服務器啟動中...\" && npm run dev"' 2>/dev/null || \
        xterm -e "cd $FRONTEND_PATH && npm run dev" 2>/dev/null &
        
        echo ""
        echo -e "${GREEN}================================${NC}"
        echo -e "${GREEN}  服務已啟動！${NC}"
        echo -e "${GREEN}================================${NC}"
        echo ""
        echo -e "${CYAN}後端 API: http://localhost:3000${NC}"
        echo -e "${CYAN}前端應用: http://localhost:5173${NC}"
        echo ""
        echo -e "${YELLOW}提示: 在新終端視窗中查看服務器日誌${NC}"
        ;;
    
    2)
        echo ""
        echo -e "${YELLOW}啟動後端服務器...${NC}"
        cd "$BACKEND_PATH"
        npm run dev
        ;;
    
    3)
        echo ""
        echo -e "${YELLOW}啟動前端開發服務器...${NC}"
        cd "$FRONTEND_PATH"
        npm run dev
        ;;
    
    4)
        echo ""
        echo -e "${CYAN}================================${NC}"
        echo -e "${CYAN}  初始化專案${NC}"
        echo -e "${CYAN}================================${NC}"
        echo ""
        
        # 初始化後端
        echo -e "${YELLOW}1/5 安裝後端依賴...${NC}"
        cd "$BACKEND_PATH"
        
        if [ -f "package.json" ]; then
            npm install
            if [ $? -eq 0 ]; then
                echo -e "${GREEN}✓ 後端依賴安裝完成${NC}"
            else
                echo -e "${RED}✗ 後端依賴安裝失敗${NC}"
            fi
        else
            echo -e "${RED}✗ 找不到 package.json${NC}"
        fi
        
        echo ""
        echo -e "${YELLOW}2/5 設定環境變數...${NC}"
        if [ -f ".env.example" ] && [ ! -f ".env" ]; then
            cp .env.example .env
            echo -e "${GREEN}✓ 已創建 .env 檔案${NC}"
        elif [ -f ".env" ]; then
            echo -e "${GREEN}✓ .env 檔案已存在${NC}"
        else
            echo -e "${RED}✗ 找不到 .env.example${NC}"
        fi
        
        echo ""
        echo -e "${YELLOW}3/5 初始化資料庫...${NC}"
        npm run init-db
        [ $? -eq 0 ] && echo -e "${GREEN}✓ 資料庫初始化完成${NC}"
        
        echo ""
        echo -e "${YELLOW}4/5 植入種子資料...${NC}"
        npm run seed
        [ $? -eq 0 ] && echo -e "${GREEN}✓ 種子資料植入完成${NC}"
        
        echo ""
        echo -e "${YELLOW}5/5 安裝前端依賴...${NC}"
        cd "$FRONTEND_PATH"
        
        if [ -f "package.json" ]; then
            npm install
            if [ $? -eq 0 ]; then
                echo -e "${GREEN}✓ 前端依賴安裝完成${NC}"
            else
                echo -e "${RED}✗ 前端依賴安裝失敗${NC}"
            fi
        fi
        
        echo ""
        echo -e "${GREEN}================================${NC}"
        echo -e "${GREEN}  初始化完成！${NC}"
        echo -e "${GREEN}================================${NC}"
        echo ""
        echo -e "${CYAN}現在可以重新執行此腳本並選擇選項 1 啟動服務${NC}"
        ;;
    
    5)
        echo ""
        echo -e "${YELLOW}同步外部資料...${NC}"
        cd "$BACKEND_PATH"
        npm run sync
        echo ""
        ;;
    
    6)
        echo -e "${CYAN}再見！${NC}"
        exit 0
        ;;
    
    *)
        echo -e "${RED}無效的選項${NC}"
        exit 1
        ;;
esac

echo ""
echo -e "${CYAN}完成！${NC}"
