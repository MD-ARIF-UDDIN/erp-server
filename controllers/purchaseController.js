import Purchase from '../models/Purchase.js';
import Product from '../models/Product.js';
import mongoose from 'mongoose';

// @desc    Get all purchases
// @route   GET /api/purchases
// @access  Private
export const getPurchases = async (req, res) => {
    try {
        const purchases = await Purchase.find({})
            .populate('products.product', 'name unit')
            .sort({ purchaseDate: -1 });
        res.json(purchases);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get single purchase
// @route   GET /api/purchases/:id
// @access  Private
export const getPurchaseById = async (req, res) => {
    try {
        const purchase = await Purchase.findById(req.params.id)
            .populate('products.product', 'name unit');

        if (purchase) {
            res.json(purchase);
        } else {
            res.status(404).json({ message: 'Purchase not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Create purchase
// @route   POST /api/purchases
// @access  Private
export const createPurchase = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { purchaseDate, products, otherExpenses } = req.body;

        // Calculate totals
        let totalProductCost = 0;
        const processedProducts = [];

        for (const item of products) {
            const product = await Product.findById(item.product).session(session);

            if (!product) {
                await session.abortTransaction();
                session.endSession();
                return res.status(404).json({ message: `Product not found: ${item.product}` });
            }

            const itemTotal = item.quantity * item.purchasePrice;
            totalProductCost += itemTotal;

            processedProducts.push({
                product: product._id,
                productName: product.name,
                quantity: item.quantity,
                unit: product.unit,
                purchasePrice: item.purchasePrice,
                totalPrice: itemTotal
            });

            // Update product stock and average purchase price
            const oldStock = product.currentStock;
            const oldAvgPrice = product.averagePurchasePrice;
            const newStock = oldStock + item.quantity;

            // Weighted average calculation
            const newAvgPrice = ((oldStock * oldAvgPrice) + (item.quantity * item.purchasePrice)) / newStock;

            product.currentStock = newStock;
            product.averagePurchasePrice = newAvgPrice;
            await product.save({ session });
        }

        const totalOtherExpenses = otherExpenses?.reduce((sum, exp) => sum + exp.amount, 0) || 0;
        const totalPurchaseAmount = totalProductCost + totalOtherExpenses;

        const purchase = await Purchase.create([{
            purchaseDate,
            products: processedProducts,
            otherExpenses: otherExpenses || [],
            totalProductCost,
            totalOtherExpenses,
            totalPurchaseAmount
        }], { session });

        await session.commitTransaction();
        session.endSession();

        const populatedPurchase = await Purchase.findById(purchase[0]._id)
            .populate('products.product', 'name unit');

        res.status(201).json(populatedPurchase);
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete purchase
// @route   DELETE /api/purchases/:id
// @access  Private
export const deletePurchase = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const purchase = await Purchase.findById(req.params.id).session(session);

        if (!purchase) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({ message: 'Purchase not found' });
        }

        // Reverse stock changes
        for (const item of purchase.products) {
            const product = await Product.findById(item.product).session(session);

            if (product) {
                const oldStock = product.currentStock;
                const newStock = oldStock - item.quantity;

                if (newStock < 0) {
                    await session.abortTransaction();
                    session.endSession();
                    return res.status(400).json({
                        message: `Cannot delete: ${product.name} stock would become negative`
                    });
                }

                // Recalculate average price
                if (newStock === 0) {
                    product.averagePurchasePrice = 0;
                } else {
                    const totalValue = (oldStock * product.averagePurchasePrice) - (item.quantity * item.purchasePrice);
                    product.averagePurchasePrice = totalValue / newStock;
                }

                product.currentStock = newStock;
                await product.save({ session });
            }
        }

        await Purchase.deleteOne({ _id: req.params.id }).session(session);

        await session.commitTransaction();
        session.endSession();

        res.json({ message: 'Purchase removed' });
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        res.status(500).json({ message: error.message });
    }
};
