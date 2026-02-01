import express from 'express';
import {
    getSales,
    getSaleById,
    createSale,
    deleteSale
} from '../controllers/saleController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.route('/')
    .get(protect, getSales)
    .post(protect, createSale);

router.route('/:id')
    .get(protect, getSaleById)
    .delete(protect, deleteSale);

export default router;
