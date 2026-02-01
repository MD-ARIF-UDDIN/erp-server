import express from 'express';
import { getProfitReport, getDashboardStats } from '../controllers/reportController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/profit', protect, getProfitReport);
router.get('/dashboard', protect, getDashboardStats);

export default router;
