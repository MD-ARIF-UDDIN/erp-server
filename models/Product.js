import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    unit: {
        type: String,
        required: true,
        trim: true
    },
    currentStock: {
        type: Number,
        default: 0,
        min: 0
    },
    averagePurchasePrice: {
        type: Number,
        default: 0,
        min: 0
    }
}, {
    timestamps: true
});

const Product = mongoose.model('Product', productSchema);

export default Product;
