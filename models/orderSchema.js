const mongoose = require("mongoose");
const { Schema } = mongoose;
const { v4: uuidv4 } = require("uuid");

const orderSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  orderId: {
    type: String,
    default: () => uuidv4(),
    unique: true,
  },
  orderedItems: [
    {
      product: {
        type: Schema.Types.ObjectId,
        ref: "Product",
        required: true,
      },
      quantity: {
        type: Number,
        required: true,
      },
      price: {
        type: Number,
        default: 0,
      },

      status: {
        type: String,
        enum: [
          "Pending",
          "Processing",
          "Shipped",
          "Delivered",
          "Cancel Request",
          "Cancelled",
          "Return Request",
          "Returned",
        ],
        default: "Pending",
      },
      cancellationReason: {
        type: String,
        default: "none",
      },
      returnReason: {
        type: String,
        default: "none",
      },
      cancelQuantity:{
        type:Number,
        default:0
      },
      returnQuantity:{
        type:Number,
        default:0
      }
    },
  ],
  totalPrice: {
    type: Number,
    required: true,
  },
  discount: {
    type: Number,
    default: 0,
  },
  finalAmount: {
    type: Number,
    required: true,
  },
  address: {
    type: Schema.Types.ObjectId,
    ref: "Address",
    required: true,
  },
  invoice: {
    invoiceNo: {
      type: String,
      default: () => uuidv4().split('-')[0],
      unique: true
    },
  invoiceDate: {
    type: Date,
    default : Date.now
  }
},
  status: {
    type: String,
    required: true,
    enum: [
      "Pending",
      "Processing",
      "Shipped",
      "Delivered",
      "Cancel Request",
      "Cancelled",
      "Return Request",
      "Returned",
    ],
    default: "pending",
  },
  paymentMethod: { type: String, enum: ["COD", "Razorpay" , "Wallet"], default: "COD" },
  razorpayOrderId: String,
  razorpayPaymentId: String,
  paymentStatus: {
    type: String,
    enum: ["Pending", "Completed","Failed" , "Refunded"],
    default: "Pending",
  },
  createdOn: {
    type: Date,
    default: Date.now,
    required: true,
  },
  couponApplied: {
    type: Boolean,
    default: false,
  },
  appliedCoupon: {
    code: { type: String },
    discountAmount: { type: Number, default: 0 }, // Stores discount value from the coupon
    discountType: { type: String, enum: ["percentage", "amount"] }, // Tracks the type of discount
  },
  cancellationReason: {
    type: String,
    default: "none",
  },
  returnReason: {
    type: String,
    default: "none",
  },
});

const Order = mongoose.model("Order", orderSchema);
module.exports = Order;
