import User from '../models/User.js';
import { generateToken } from '../utils/generateToken.js';

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
export const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });

        if (user && (await user.matchPassword(password))) {
            res.json({
                _id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                businessName: user.businessName,
                address: user.address,
                currency: user.currency,
                shopDescription: user.shopDescription,
                businessLogo: user.businessLogo,
                lowStockThreshold: user.lowStockThreshold,
                role: user.role,
                token: generateToken(user._id)
            });
        } else {
            res.status(401).json({ message: 'Invalid email or password' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get user profile
// @route   GET /api/auth/profile
// @access  Private
export const getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('-password');
        if (user) {
            res.json(user);
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
export const updateProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);

        if (user) {
            user.name = req.body.name || user.name;
            user.phone = req.body.phone || user.phone;
            user.businessName = req.body.businessName || user.businessName;
            user.address = req.body.address || user.address;
            user.currency = req.body.currency || user.currency;
            user.shopDescription = req.body.shopDescription || user.shopDescription;
            user.businessLogo = req.body.businessLogo || user.businessLogo;
            user.lowStockThreshold = req.body.lowStockThreshold !== undefined ? req.body.lowStockThreshold : user.lowStockThreshold;

            if (req.body.password) {
                user.password = req.body.password;
            }

            const updatedUser = await user.save();

            res.json({
                _id: updatedUser._id,
                name: updatedUser.name,
                email: updatedUser.email,
                phone: updatedUser.phone,
                businessName: updatedUser.businessName,
                address: updatedUser.address,
                currency: updatedUser.currency,
                shopDescription: updatedUser.shopDescription,
                businessLogo: updatedUser.businessLogo,
                lowStockThreshold: updatedUser.lowStockThreshold,
                role: updatedUser.role,
                token: generateToken(updatedUser._id)
            });
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
