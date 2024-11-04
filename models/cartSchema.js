
const mongoose = require("mongoose");
const {Schema} = mongoose;


const cartSchema = new Schema({

    userId :{
        type:Schema.Types.ObjectId,
        ref:"User",
        required:true
    },
    items:[{
        productId:{
            type:Schema.Types.ObjectId,
            ref:'Product',
            required:true
        },
        quantity:{
            type:Number,
            default:1
        },
        price:{
            type:Number,
            required:true
        },
        regularPrice: {  // add regular price for MRP calculation
            type: Number,
            required: true
        },
        totalPrice:{
            type:Number,
            required:true
        },
        



}],

    shippingFee: { type: Number, default: 0 },
    totalPrice: { type: Number, required: true },
    totalMRP: { type: Number, default: 0 }, // Total MRP
    totalDiscount: { type: Number, default: 0 }, // Total discount
    finalAmount: { type: Number, required: true } ,
    appliedCoupon: {
        code: { type: String, default: null },
        discountAmount: { type: Number, default: 0 }
      }
})

const Cart = mongoose.model("Cart",cartSchema);
module.exports = Cart;