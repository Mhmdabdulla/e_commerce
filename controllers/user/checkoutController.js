const Cart = require('../../models/cartSchema');
const Address = require('../../models/addressSchema');
const Order = require('../../models/orderSchema')
const User = require('../../models/userSchema')
const Product = require('../../models/productSchema')
const Wallet = require('../../models/walletSchema')
const Coupon = require('../../models/couponSchema')
// const Coupon = require('../models/coupon');
const Razorpay = require("razorpay");
const crypto = require("crypto");
const env = require('dotenv').config();

// Initialize Razorpay instance with credentials
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});


const getCheckoutPage = async (req, res) => {
    try {
        const userId = req.session.user;  
        const cart = await Cart.findOne({ userId }).populate('items.productId');
        const addresses = await Address.find({ user:userId });
        const user = await User.findOne({_id:userId})
        const coupons = await Coupon.find({isActive:true}); 
        

        res.render('user/checkout', { cart, addresses ,user,coupons});
    } catch (error) {
        console.error("Error fetching checkout page data: ", error);
        res.status(500).send("Internal Server Error");
    }


}

const placeOrder = async (req,res) =>{
    try {
        const { selectedAddress, paymentMethod } = req.body;


        const userId = req.session.user;  
        const cart = await Cart.findOne({ userId }).populate('items.productId');

        if (!cart || cart.items.length === 0) {
            return res.status(400).send("Your cart is empty");
        }

        const orderedItems = cart.items.map(item => ({
            product: item.productId._id,
            quantity: item.quantity,
            price: item.totalPrice
        }));


            // Determine if a coupon is applied
    const isCouponApplied = !!cart.appliedCoupon;
    const appliedCoupon = isCouponApplied
      ? {
          code: cart.appliedCoupon.code,
          discountAmount: cart.totalDiscount,
          discountType: cart.appliedCoupon.discountType,
        }
      : null;

        if (paymentMethod === 'Cash on Delivery') {
            const newOrder = new Order({
            userId,
            orderedItems,
            totalPrice: cart.totalPrice,
            finalAmount: cart.finalAmount,  
            discount : cart.totalDiscount,
            address: selectedAddress,
            status: 'Pending',
            paymentMethod: "COD",
            couponApplied: isCouponApplied,
            appliedCoupon: appliedCoupon, 
        });

        await newOrder.save();

        const user = await User.findOne({_id:userId})

        // Clear the user's cart after placing order
        await Cart.findOneAndUpdate({ userId }, { items: [], totalPrice: 0 ,appliedCoupon : { code: null, discountAmount: 0 }});
       // Send success response for COD to frontend
       return res.json({ success: true });
    } else if (paymentMethod === "Razorpay") {
        // Create Razorpay order
        const razorpayOrder = await razorpay.orders.create({
          amount: cart.finalAmount * 100, // Amount in smallest currency unit (paise)
          currency: "INR",
          receipt: `order_rcptid_${new Date().getTime()}`,
        });
  
        // Create an order in your database with the status as "Pending"
        const newOrder = new Order({
          userId,
          orderedItems,
          totalPrice: cart.totalPrice,
          finalAmount: cart.finalAmount,
          discount : cart.totalDiscount,
          address: selectedAddress,
          status: "Pending",
          paymentMethod: "Razorpay",
          razorpayOrderId: razorpayOrder.id,
          couponApplied: isCouponApplied,
          appliedCoupon: appliedCoupon,
        });
  
        await newOrder.save();

        // Clear the user's cart after placing order
        await Cart.findOneAndUpdate({ userId }, { items: [], totalPrice: 0 ,appliedCoupon : { code: null, discountAmount: 0 }});
        
        // Send the Razorpay order details to frontend
        return res.json({
          razorpayOrderId: razorpayOrder.id,
          amount: razorpayOrder.amount,
          currency: razorpayOrder.currency,
          orderId: newOrder._id,
        });
      }

    } catch (err) {
        console.error(err);
        res.status(500).send("Server error");
    }
};

//verify payment
const verifyPayment = async (req, res) => {
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature, orderId } = req.body;
  
    const generatedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(razorpay_order_id + "|" + razorpay_payment_id)
      .digest("hex");
  
    if (generatedSignature === razorpay_signature) {
      await Order.findByIdAndUpdate(orderId, {
        paymentStatus: "Completed",
        razorpayPaymentId: razorpay_payment_id,
        status: 'Pending',
      });
      return res.json({ success: true });
    } else {
      return res.json({ success: false });
    }
  };

const getOrders = async (req, res) => {
    try {
        const orders = await Order.find({ userId: req.session.user}).populate('orderedItems.product').sort({createdOn : -1}); // Assuming each order has items with product references
        const user = await User.findOne({_id:req.session.user})
        res.render('user/orders', { orders,user });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

const getOrderDetails = async (req,res) =>{
    try {
        const orderId = req.params.orderId;
     
        
        const order = await Order.findOne({ orderId }).populate('orderedItems.product').populate('address');

        if (!order) {
            return res.status(404).send("Order not found");
        }
        

        res.render('user/order-detail', { order });
    } catch (error) {
        console.error(error);
        res.status(500).redirect('/pageNotFound');
    }
}

const cancelOrReturn = async (req,res) => {
    const { orderId, action } = req.params;
    const { reason } = req.body;

    try {
        const order = await Order.findOne({ orderId });

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

           // Check if payment was successful
           if (order.paymentStatus === 'Completed') {
            const refundAmount = order.finalAmount;

            // Find the user's wallet
            const user = await User.findById(order.userId).populate("wallet");
            if (user && user.wallet) {
                const wallet = await Wallet.findById(user.wallet._id);

                // Update wallet balance and add transaction
                wallet.balance += refundAmount;
                wallet.transactions.push({
                    type: "credit",
                    amount: refundAmount,
                    description: `Refund for ${action}ed order ${orderId}`,
                    date: new Date(),
                });
                
                await wallet.save(); // Save updated wallet
            }
        }
     
        

        if (action === 'cancel') {
            order.status = 'Cancelled';
            order.cancellationReason = reason;
        } else if (action === 'return') {
            order.status = 'Return Request';
            order.returnReason = reason;
        }

        // Update stock for each product in the order
        for (let item of order.orderedItems) {
            const product = await Product.findById(item.product);

            if (product) {
                product.stock += item.quantity; // Increment stock by the quantity ordered
                await product.save(); // Save the updated product
            }
        }
        

        await order.save();
        res.status(200).json({ message: `Order ${action}ed successfully` });
    } catch (error) {
        res.status(500).json({ message: 'Error processing your request', error });
        console.log(error)
    }
}

const orderSuccess = async(req,res) => {
    try {
        res.render('user/order-success')
        
    } catch (error) {
        console.log('Error order success',error)
        res.redirect('/pageNotFound')
    }
}

const getWallet = async (req, res) => {
    try {
        // Assuming user ID is stored in session
        const userId = req.session.user;
        const user = await User.findById(userId).populate("wallet");

        if (!user || !user.wallet) {
            return res.status(404).json({ message: "Wallet not found" });
        }

        res.render("user/wallet", {
            user,
            wallet: user.wallet
        });
    } catch (error) {
        console.error("Error fetching wallet:", error);
        res.status(500).json({ message: "Failed to retrieve wallet" });
    }
};



module.exports = {
    getCheckoutPage,
    placeOrder,
    getOrders,
    getOrderDetails,
    cancelOrReturn,
    verifyPayment,
    orderSuccess,
    getWallet
}