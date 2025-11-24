import express from 'express';
import {
  submitScore,
  getLeaderboard,
  getGameStats,
  getPersonalBest
} from '../controllers/gameController.js';

const router = express.Router();

// POST /api/game/score - 提交遊戲分數
router.post('/score', submitScore);

// GET /api/game/leaderboard - 取得排行榜
router.get('/leaderboard', getLeaderboard);

// GET /api/game/stats - 取得遊戲統計
router.get('/stats', getGameStats);

// GET /api/game/personal/:nickname - 取得個人最佳紀錄
router.get('/personal/:nickname', getPersonalBest);

export default router;
