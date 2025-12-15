import express from 'express';
import { getOceanStats } from '../controllers/oceanController.js';

const router = express.Router();

// GET /api/oceans/stats - Ocean-level stats (no mock data)
router.get('/stats', getOceanStats);

export default router;

