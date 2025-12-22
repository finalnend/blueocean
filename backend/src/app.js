import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { startAllSchedules } from './scripts/syncData.js';
import getDatabase from './database/db.js';

// 載入路由
import pollutionRoutes from './routes/pollution.js';
import gameRoutes from './routes/game.js';
import resourceRoutes from './routes/resources.js';
import authRoutes from './routes/auth.js';
import trackerRoutes from './routes/tracker.js';
import oceanRoutes from './routes/oceans.js';

// 載入環境變數
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy when behind nginx/reverse proxy (required for rate limiting)
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

function repairSeededResourceLinks() {
  if (process.env.NODE_ENV === 'test') return;

  try {
    const db = getDatabase();
    const repairedUrl = 'https://oceanliteracy.unesco.org/resources/';
    const result = db
      .prepare(
        "UPDATE resource_links SET url = ? WHERE TRIM(url) = '#' AND type = 'teaching'"
      )
      .run(repairedUrl);

    if (result.changes > 0) {
      console.log(`Repaired ${result.changes} resource link(s) with missing URL.`);
    }
  } catch (error) {
    console.warn(
      'Startup resource link repair skipped:',
      error?.message ? error.message : error
    );
  }
}

repairSeededResourceLinks();

// 安全性中介層
app.use(helmet());

// CORS 設定
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true
}));

// 壓縮回應
app.use(compression());

// 解析 JSON
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting - 防止 API 濫用
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 1 * 60 * 1000, // 1 分鐘
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 200, // 每分鐘 200 次請求
  message: { error: '請求過於頻繁，請稍後再試' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

// 健康檢查端點
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API 路由
app.use('/api/pollution', pollutionRoutes);
app.use('/api/game', gameRoutes);
app.use('/api/resources', resourceRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/tracker', trackerRoutes);
app.use('/api/oceans', oceanRoutes);

// 根路徑
app.get('/', (req, res) => {
  res.json({
    message: 'Blue Earth Watch API',
    version: '1.0.0',
    endpoints: {
      pollution: '/api/pollution',
      game: '/api/game',
      resources: '/api/resources',
      tracker: '/api/tracker',
      health: '/health'
    },
    documentation: 'https://github.com/your-username/blue-earth-watch'
  });
});

// 404 處理
app.use((req, res) => {
  res.status(404).json({ 
    error: '找不到該端點',
    path: req.path 
  });
});

// 錯誤處理中介層
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  const status = err.status || 500;
  const message = err.message || '伺服器內部錯誤';
  
  res.status(status).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 啟動伺服器
app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════╗
║   Blue Earth Watch API Server 🌍          ║
║                                           ║
║   Port: ${PORT}                             ║
║   Environment: ${process.env.NODE_ENV || 'development'}              ║
║                                           ║
║   API Base: http://localhost:${PORT}/api    ║
╚═══════════════════════════════════════════╝
  `);
  
  // 啟動資料同步排程
  if (process.env.NODE_ENV !== 'test') {
    startAllSchedules();
  }
});

export default app;
