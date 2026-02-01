import express from 'express';
import {
    getPurchases,
    getPurchaseById,
    createPurchase,
    deletePurchase
} from '../controllers/purchaseController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.route('/')
    .get(protect, getPurchases)
    .post(protect, createPurchase);

router.route('/:id')
    .get(protect, getPurchaseById)
    .delete(protect, deletePurchase);

export default router;
