import express from 'express';
import {
  getResources,
  getResourceById,
  getResourceTypes,
  getPopularTags,
  addResource
} from '../controllers/resourceController.js';

const router = express.Router();

// GET /api/resources - 取得資源列表
router.get('/', getResources);

// GET /api/resources/types - 取得資源類型
router.get('/types', getResourceTypes);

// GET /api/resources/tags - 取得熱門標籤
router.get('/tags', getPopularTags);

// GET /api/resources/:id - 取得單一資源
router.get('/:id', getResourceById);

// POST /api/resources - 新增資源（管理員）
router.post('/', addResource);

export default router;
