import express from 'express';
import { login, getProfile, updateProfile } from '../controllers/authController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.post('/login', login);
router.route('/profile')
    .get(protect, getProfile)
    .put(protect, updateProfile);

export default router;
