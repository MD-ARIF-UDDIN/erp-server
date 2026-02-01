import mongoose from 'mongoose';

const purchaseSchema = new mongoose.Schema({
    purchaseDate: {
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
        purchasePrice: {
            type: Number,
            required: true,
            min: 0
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
    totalProductCost: {
        type: Number,
        required: true,
        default: 0
    },
    totalOtherExpenses: {
        type: Number,
        default: 0
    },
    totalPurchaseAmount: {
        type: Number,
        required: true,
        default: 0
    }
}, {
    timestamps: true
});

const Purchase = mongoose.model('Purchase', purchaseSchema);

export default Purchase;
