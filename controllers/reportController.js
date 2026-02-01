import Purchase from '../models/Purchase.js';
import Sale from '../models/Sale.js';

// @desc    Get profit report
// @route   GET /api/reports/profit?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
// @access  Private
export const getProfitReport = async (req, res) => {
    try {
        const { startDate, endDate, productId } = req.query;

        let purchaseFilter = {};
        let saleFilter = {};

        if (startDate && endDate) {
            const start = new Date(startDate);
            start.setHours(0, 0, 0, 0);

            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);

            purchaseFilter.purchaseDate = { $gte: start, $lte: end };
            saleFilter.saleDate = { $gte: start, $lte: end };
        }

        if (productId) {
            purchaseFilter['products.product'] = productId;
            saleFilter['products.product'] = productId;
        }

        // Get purchases in date range
        const purchases = await Purchase.find(purchaseFilter);

        // Calculate total purchase and other expenses
        let totalPurchase = 0;
        let totalPurchaseOtherExpenses = 0;

        purchases.forEach(purchase => {
            if (productId) {
                // If filtering by product, only count cost for that specific product row
                const relevantProduct = purchase.products.find(p => p.product.toString() === productId);
                if (relevantProduct) {
                    totalPurchase += relevantProduct.quantity * relevantProduct.purchasePrice;
                }
            } else {
                totalPurchase += purchase.totalProductCost;
            }
            totalPurchaseOtherExpenses += purchase.totalOtherExpenses;
        });

        // Get sales in date range
        const sales = await Sale.find(saleFilter);

        // Calculate total sale and cost of goods sold
        let totalSale = 0;
        let totalCostOfGoodsSold = 0;
        let totalSaleOtherExpenses = 0;

        // Track per-product stats
        const productStats = {};

        sales.forEach(sale => {
            let saleAmount = 0;
            let saleCogs = 0;

            sale.products.forEach(item => {
                const isRelevant = !productId || item.product.toString() === productId;

                if (isRelevant) {
                    const itemAmount = item.quantity * item.salePrice;
                    const itemCogs = item.quantity * item.purchasePriceAtSale;

                    saleAmount += itemAmount;
                    saleCogs += itemCogs;

                    // Update product-wise breakdown
                    const pKey = item.product.toString();
                    if (!productStats[pKey]) {
                        productStats[pKey] = {
                            name: item.productName || 'Unknown Product',
                            sales: 0,
                            cogs: 0,
                            quantity: 0
                        };
                    }
                    productStats[pKey].sales += itemAmount;
                    productStats[pKey].cogs += itemCogs;
                    productStats[pKey].quantity += item.quantity;
                }
            });

            totalSale += saleAmount;
            totalCostOfGoodsSold += saleCogs;
            totalSaleOtherExpenses += (sale.totalOtherExpenses || 0);
        });

        // Combined other expenses
        const totalOtherExpenses = totalPurchaseOtherExpenses + totalSaleOtherExpenses;

        // Calculate profit
        const totalProfit = totalSale - (totalCostOfGoodsSold + totalOtherExpenses);

        // Convert productStats object to sorted array
        const productBreakdown = Object.values(productStats)
            .sort((a, b) => b.sales - a.sales);

        res.json({
            startDate: startDate || null,
            endDate: endDate || null,
            productId: productId || null,
            totalSale,
            totalPurchase,
            totalPurchaseOtherExpenses,
            totalSaleOtherExpenses,
            totalOtherExpenses,
            totalCostOfGoodsSold,
            totalProfit,
            purchaseCount: purchases.length,
            saleCount: sales.length,
            productBreakdown
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get dashboard stats
// @route   GET /api/reports/dashboard
// @access  Private
export const getDashboardStats = async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Today's sales
        const todaySales = await Sale.find({
            saleDate: { $gte: today, $lt: tomorrow }
        });

        const todaySaleAmount = todaySales.reduce((sum, sale) => sum + sale.totalSaleAmount, 0);

        // Today's purchases
        const todayPurchases = await Purchase.find({
            purchaseDate: { $gte: today, $lt: tomorrow }
        });

        const todayPurchaseAmount = todayPurchases.reduce((sum, purchase) => sum + purchase.totalPurchaseAmount, 0);

        // This month
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

        const monthSales = await Sale.find({
            saleDate: { $gte: firstDayOfMonth }
        });

        const monthSaleAmount = monthSales.reduce((sum, sale) => sum + sale.totalSaleAmount, 0);

        const monthPurchases = await Purchase.find({
            purchaseDate: { $gte: firstDayOfMonth }
        });

        const monthPurchaseAmount = monthPurchases.reduce((sum, purchase) => sum + purchase.totalPurchaseAmount, 0);

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
