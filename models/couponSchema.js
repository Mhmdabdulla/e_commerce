const mongoose = require("mongoose");
const { Schema } = mongoose;

const couponSchema = new Schema({
    code: {  // Changed from 'name' to 'code'
        type: String,
        required: true,
        unique: true
    },
    createdOn: {
        type: Date,
        default: Date.now
    },
    expiryDate: {  
        type: Date,
        required: true
    },
    discountAmount: {  
        type: Number,
        required: true
    },
    discountType: { 
        type: String,
        enum: ['fixed', 'percentage'],  // 'fixed' for a dollar amount, 'percentage' for a % discount
        required: true
    },
    minimumPrice: {
        type: Number,
        required: true
    },
    maximumPrice: {
        type: Number,
        required: true
    },
    isActive: {  // Changed from 'isList' to 'isActive'
        type: Boolean,
        default: true
    },
});

const Coupon = mongoose.model("Coupon", couponSchema);

module.exports = Coupon;
