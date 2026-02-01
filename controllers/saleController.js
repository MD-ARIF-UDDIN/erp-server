import Sale from '../models/Sale.js';
import Product from '../models/Product.js';
import mongoose from 'mongoose';

// @desc    Get all sales
// @route   GET /api/sales
// @access  Private
export const getSales = async (req, res) => {
    try {
        const sales = await Sale.find({})
            .populate('products.product', 'name unit')
            .sort({ saleDate: -1 });
        res.json(sales);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get single sale
// @route   GET /api/sales/:id
// @access  Private
export const getSaleById = async (req, res) => {
    try {
        const sale = await Sale.findById(req.params.id)
            .populate('products.product', 'name unit');

        if (sale) {
            res.json(sale);
        } else {
            res.status(404).json({ message: 'Sale not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Create sale
// @route   POST /api/sales
// @access  Private
export const createSale = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { saleDate, products, otherExpenses } = req.body;

        let totalProductAmount = 0;
        const processedProducts = [];

        for (const item of products) {
            const product = await Product.findById(item.product).session(session);

            if (!product) {
                await session.abortTransaction();
                session.endSession();
                return res.status(404).json({ message: `Product not found: ${item.product}` });
            }

            // Check stock availability
            if (product.currentStock < item.quantity) {
                await session.abortTransaction();
                session.endSession();
                return res.status(400).json({
                    message: `Insufficient stock for ${product.name}. Available: ${product.currentStock}`
                });
            }

            const itemTotal = item.quantity * item.salePrice;
            totalProductAmount += itemTotal;

            processedProducts.push({
                product: product._id,
                productName: product.name,
                quantity: item.quantity,
                unit: product.unit,
                salePrice: item.salePrice,
                purchasePriceAtSale: product.averagePurchasePrice,
                totalPrice: itemTotal
            });

            // Update product stock and average sale price
            const oldTotalSold = product.totalSold || 0;
            const oldAvgSalePrice = product.averageSalePrice || 0;
            const newTotalSold = oldTotalSold + item.quantity;

            // Weighted average calculation for sale price
            const newAvgSalePrice = ((oldTotalSold * oldAvgSalePrice) + (item.quantity * item.salePrice)) / newTotalSold;

            product.currentStock -= item.quantity;
            product.totalSold = newTotalSold;
            product.averageSalePrice = newAvgSalePrice;
            await product.save({ session });
        }

        const totalOtherExpenses = otherExpenses?.reduce((sum, exp) => sum + exp.amount, 0) || 0;
        const totalSaleAmount = totalProductAmount + totalOtherExpenses;

        const sale = await Sale.create([{
            saleDate,
            products: processedProducts,
            otherExpenses: otherExpenses || [],
            totalProductAmount,
            totalOtherExpenses,
            totalSaleAmount
        }], { session });

        await session.commitTransaction();
        session.endSession();

        const populatedSale = await Sale.findById(sale[0]._id)
            .populate('products.product', 'name unit');

        res.status(201).json(populatedSale);
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete sale
// @route   DELETE /api/sales/:id
// @access  Private
export const deleteSale = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const sale = await Sale.findById(req.params.id).session(session);

        if (!sale) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({ message: 'Sale not found' });
        }

        // Reverse stock changes
        for (const item of sale.products) {
            const product = await Product.findById(item.product).session(session);

            if (product) {
                const oldTotalSold = product.totalSold || 0;
                const newTotalSold = Math.max(0, oldTotalSold - item.quantity);

                if (newTotalSold === 0) {
                    product.averageSalePrice = 0;
                } else {
                    const totalSaleVal = (oldTotalSold * product.averageSalePrice) - (item.quantity * item.salePrice);
                    product.averageSalePrice = totalSaleVal / newTotalSold;
                }

                product.totalSold = newTotalSold;
                product.currentStock += item.quantity;
                await product.save({ session });
            }
        }

        await Sale.deleteOne({ _id: req.params.id }).session(session);

        await session.commitTransaction();
        session.endSession();

        res.json({ message: 'Sale removed' });
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        res.status(500).json({ message: error.message });
    }
};
