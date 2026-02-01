import mongoose from 'mongoose';

const saleSchema = new mongoose.Schema({
    saleDate: {
        type: Date,
        required: true
    },
    products: [{
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            required: true
        },
        productName: String,
        quantity: {
            type: Number,
            required: true,
            min: 0
        },
        unit: String,
        salePrice: {
            type: Number,
            required: true,
            min: 0
        },
        purchasePriceAtSale: {
            type: Number,
            default: 0
        },
        totalPrice: {
            type: Number,
            required: true,
            min: 0
        }
    }],
    otherExpenses: [{
        name: {
            type: String,
            required: true,
            trim: true
        },
        amount: {
            type: Number,
            required: true,
            min: 0
        }
    }],
    totalProductAmount: {
        type: Number,
        required: true,
        default: 0
    },
    totalOtherExpenses: {
        type: Number,
        default: 0
    },
    totalSaleAmount: {
        type: Number,
        required: true,
        default: 0
    }
}, {
    timestamps: true
});

const Sale = mongoose.model('Sale', saleSchema);

export default Sale;
