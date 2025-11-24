import express from 'express';
import {
  getPollutionSummary,
  getMapData,
  getTimeSeries,
  getPollutionTypes
} from '../controllers/pollutionController.js';

const router = express.Router();

// GET /api/pollution/summary - 取得污染摘要
router.get('/summary', getPollutionSummary);

// GET /api/pollution/map - 取得地圖資料
router.get('/map', getMapData);

// GET /api/pollution/timeseries - 取得時間序列
router.get('/timeseries', getTimeSeries);

// GET /api/pollution/types - 取得污染類型列表
router.get('/types', getPollutionTypes);

export default router;
