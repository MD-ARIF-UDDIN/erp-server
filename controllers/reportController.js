import Purchase from '../models/Purchase.js';
import Sale from '../models/Sale.js';
import Product from '../models/Product.js';
import mongoose from 'mongoose';

// @desc    Get profit report with product breakdown
export const getProfitReport = async (req, res) => {
    try {
        const { startDate, endDate, productId } = req.query;
        let purchaseFilter = {};
        let saleFilter = {};

        // 1. Setup Date Filters
        if (startDate && endDate) {
            const start = new Date(startDate);
            start.setHours(0, 0, 0, 0);
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            purchaseFilter.purchaseDate = { $gte: start, $lte: end };
            saleFilter.saleDate = { $gte: start, $lte: end };
        }

        // 2. Setup Product Filters
        const isFiltering = productId && productId !== '' && productId !== 'all';
        if (isFiltering) {
            try {
                const targetId = new mongoose.Types.ObjectId(productId);
                purchaseFilter['products.product'] = targetId;
                saleFilter['products.product'] = targetId;
            } catch (err) {
                return res.status(400).json({ message: 'Invalid Product ID format' });
            }
        }

        // 3. Fetch Data in Parallel
        const [purchases, sales, allProducts] = await Promise.all([
            Purchase.find(purchaseFilter).lean(),
            Sale.find(saleFilter).lean(),
            Product.find({}).select('name unit currentStock averagePurchasePrice averageSalePrice').lean()
        ]);

        // 4. Initialize Calculation Variables
        let totalRevenue = 0;
        let totalCOGS = 0;
        let totalExpenses = 0;

        // Structure to hold per-product metrics
        const statsMap = {};
        allProducts.forEach(p => {
            statsMap[p._id.toString()] = {
                id: p._id,
                name: p.name,
                unit: p.unit,
                currentStock: p.currentStock || 0,
                avgPurchase: p.averagePurchasePrice || 0,
                avgSale: p.averageSalePrice || 0,
                sales: 0,
                quantity: 0, // sold quantity
                purchaseQty: 0,
                purchaseAmount: 0,
                cogs: 0,
                profit: 0
            };
        });

        // 5. Process Sales Data
        sales.forEach(sale => {
            sale.products.forEach(item => {
                const itemPID = item.product?.toString();
                if (!itemPID) return;

                // Check if this item matches the filter (or if no filter active)
                const isMatch = !isFiltering || itemPID === productId.toString();

                if (isMatch) {
                    const rev = (item.quantity * item.salePrice) || 0;
                    const cost = (item.quantity * item.purchasePriceAtSale) || 0;

                    totalRevenue += rev;
                    totalCOGS += cost;

                    if (statsMap[itemPID]) {
                        statsMap[itemPID].sales += rev;
                        statsMap[itemPID].cogs += cost;
                        statsMap[itemPID].quantity += item.quantity;
                        statsMap[itemPID].profit = statsMap[itemPID].sales - statsMap[itemPID].cogs;
                    }
                }
            });

            // Global expenses (only added if not filtering by a specific product)
            // Or if we want to show net profit for a product, we'd need to allocate expenses.
            // For now, we keep it as Gross Profit when filtering by product.
            if (!isFiltering) {
                totalExpenses += (sale.totalOtherExpenses || 0);
            }
        });

        // 6. Process Purchase Data (to get product-based purchase data and global expenses)
        purchases.forEach(purchase => {
            purchase.products.forEach(item => {
                const itemPID = item.product?.toString();
                if (!itemPID) return;

                const isMatch = !isFiltering || itemPID === productId.toString();
                if (isMatch && statsMap[itemPID]) {
                    statsMap[itemPID].purchaseQty += item.quantity;
                    statsMap[itemPID].purchaseAmount += (item.quantity * item.purchasePrice) || 0;
                }
            });

            if (!isFiltering) {
                totalExpenses += (purchase.totalOtherExpenses || 0);
            }
        });

        // 7. Final Net Profit
        const netProfit = totalRevenue - (totalCOGS + totalExpenses);

        // 8. Prepare Breakdown Array
        let breakdown = Object.values(statsMap);
        if (isFiltering) {
            // If filtering, only show that product
            breakdown = breakdown.filter(item => item.id.toString() === productId.toString());
        } else {
            // Show products that have either sales OR purchases OR existing stock to keep it relevant
            breakdown = breakdown.filter(item => item.quantity > 0 || item.purchaseQty > 0 || item.currentStock > 0)
                .sort((a, b) => b.sales - a.sales);
        }

        res.json({
            startDate: startDate || null,
            endDate: endDate || null,
            productId: isFiltering ? productId : null,
            isProductFiltered: isFiltering,
            totalSale: totalRevenue,
            totalCostOfGoodsSold: totalCOGS,
            totalOtherExpenses: totalExpenses,
            totalProfit: netProfit,
            purchaseCount: purchases.length,
            saleCount: sales.length,
            productBreakdown: breakdown
        });
    } catch (error) {
        console.error('Report Error:', error);
        res.status(500).json({ message: 'Internal server error while generating report' });
    }
};

// @desc    Get dashboard stats
export const getDashboardStats = async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const [todaySales, todayPurchases] = await Promise.all([
            Sale.find({ saleDate: { $gte: today, $lt: tomorrow } }).lean(),
            Purchase.find({ purchaseDate: { $gte: today, $lt: tomorrow } }).lean()
        ]);

        const todaySaleAmount = todaySales.reduce((sum, sale) => sum + (sale.totalSaleAmount || 0), 0);
        const todayPurchaseAmount = todayPurchases.reduce((sum, purchase) => sum + (purchase.totalPurchaseAmount || 0), 0);

        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const [monthSales, monthPurchases] = await Promise.all([
            Sale.find({ saleDate: { $gte: firstDayOfMonth } }).lean(),
            Purchase.find({ purchaseDate: { $gte: firstDayOfMonth } }).lean()
        ]);

        const monthSaleAmount = monthSales.reduce((sum, sale) => sum + (sale.totalSaleAmount || 0), 0);
        const monthPurchaseAmount = monthPurchases.reduce((sum, purchase) => sum + (purchase.totalPurchaseAmount || 0), 0);

        res.json({
            today: {
                sales: todaySaleAmount,
                purchases: todayPurchaseAmount,
                salesCount: todaySales.length,
                purchasesCount: todayPurchases.length
            },
            thisMonth: {
                sales: monthSaleAmount,
                purchases: monthPurchaseAmount,
                salesCount: monthSales.length,
                purchasesCount: monthPurchases.length
            }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
