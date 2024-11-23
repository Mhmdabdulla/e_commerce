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
const { error } = require('console');
const env = require('dotenv').config();
const PDFDocument = require('pdfkit')

// Initialize Razorpay instance with credentials
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});


const getCheckoutPage = async (req, res,next) => {
    try {
        const userId = req.session.user;  
        const cart = await Cart.findOne({ userId }).populate('items.productId');
        const addresses = await Address.find({ user:userId });
        const user = await User.findOne({_id:userId})
        const coupons = await Coupon.find({isActive:true}); 
        

        res.render('user/checkout', { cart, addresses ,user,coupons});
    } catch (error) {
        console.error("Error fetching checkout page data: ", error);
        next(error)
    }


}

const placeOrder = async (req,res,next) =>{
    try {
        const { selectedAddress, paymentMethod } = req.body;


        const userId = req.session.user;  
        const user = await User.findOne({_id:userId})
        if (!user) {
            return res.status(400).json({success:false , message : 'user not found'})
        }
        const cart = await Cart.findOne({ userId }).populate('items.productId');

        if (!cart || cart.items.length === 0) {
            return res.status(400).json({success:false , message : 'Your cart is empty'})
        }

        const orderedItems = cart.items.map(item => ({
            product: item.productId._id,
            quantity: item.quantity,
            price: item.totalPrice
        }));


            // Determine if a coupon is applied
    const isCouponApplied = !(cart.appliedCoupon.code === null && cart.appliedCoupon.discountAmount === 0);
    const appliedCoupon = isCouponApplied
      ? {
          code: cart.appliedCoupon.code,
          discountAmount: cart.appliedCoupon.discountAmount,
          discountType: cart.appliedCoupon.discountType,
        }
      : null;




        if (paymentMethod === 'Cash on Delivery') {



            const newOrder = new Order({
            userId,
            orderedItems,
            totalPrice: cart.totalPrice,
            totalMRP : cart.totalMRP,
            finalAmount: cart.finalAmount,  
            discount : cart.totalDiscount,
            address: selectedAddress,
            status: 'Pending',
            paymentMethod: "COD",
            couponApplied: isCouponApplied,
            appliedCoupon: appliedCoupon, 
        });

        if (newOrder.finalAmount > 500) {
            return res.status(400).json({ success: false , message : 'Order above Rs 500 should not be allowed for COD' })
        }

        await newOrder.save();

     if(newOrder.couponApplied){
        const coupon = await Coupon.findOne({code : newOrder.appliedCoupon.code})
        // Mark the coupon as used by the user
        user.usedCoupons.push(coupon._id);
        await user.save();

     }

        // Clear the user's cart after placing order
        await Cart.findOneAndUpdate({ userId }, { items: [], totalPrice: 0 ,appliedCoupon : { code: null, discountAmount: 0 }});
       // Send success response for COD to frontend
       return res.json({ success: true });
    }

    //wallet payment 
    else if (paymentMethod === "Wallet") {
       
        if (!user || !user.wallet) {
            return res.status(404).json({ success: false, message: "User  or wallet not found" });
        }

        // Check if the user has enough balance in the wallet
        if (!user.wallet) {
            return res.status(404).json({ success: false, message: "Wallet not found" });
        }

        const wallet = await Wallet.findById(user.wallet);
        if (!wallet) {
            return res.status(404).json({ success: false, message: "Wallet not found" });
        }

        if (wallet.balance < cart.finalAmount) {
            return res.status(400).json({ success: false, message: "Insufficient wallet balance" });
        }

        // Deduct the amount from the user's wallet
        wallet.balance -= cart.finalAmount;

        // Create a transaction record
        wallet.transactions.push({
            type: "debit",
            amount: cart.finalAmount,
            description: "Order payment",
            date: new Date(),
        });

        // Save the updated wallet
        await wallet.save();

        // Create the order
        const newOrder = new Order({
            userId,
            orderedItems,
            totalPrice: cart.totalPrice,
            totalMRP : cart.totalMRP, 
            finalAmount: cart.finalAmount,
            discount: cart.totalDiscount,
            address: selectedAddress,
            status: "Pending",
            paymentMethod: "Wallet",
            paymentStatus : "Completed",
            couponApplied: isCouponApplied,
            appliedCoupon: appliedCoupon,
        });

        await newOrder.save();


        if(newOrder.couponApplied){
            const coupon = await Coupon.findOne({code : newOrder.appliedCoupon.code})
            // Mark the coupon as used by the user
            user.usedCoupons.push(coupon._id);
            await user.save();
    
         }

        // Clear the user's cart after placing order
        await Cart.findOneAndUpdate({ userId }, { items: [], totalPrice: 0, appliedCoupon: { code: null, discountAmount: 0 } });
        
        return res.json({ success: true });
    }
    
    
    //Razerpay payment
    else if (paymentMethod === "Razorpay") {
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
          totalMRP : cart.totalMRP,
          finalAmount: cart.finalAmount,
          discount : cart.totalDiscount,
          address: selectedAddress,
          status: "Pending",
          paymentMethod: "Razorpay",
          paymentStatus : "Pending",
          razorpayOrderId: razorpayOrder.id,
          razorpayPaymentId:'',
          couponApplied: isCouponApplied,
          appliedCoupon: appliedCoupon,
        });
  
        await newOrder.save();

        if(newOrder.couponApplied){
            const coupon = await Coupon.findOne({code : newOrder.appliedCoupon.code})
            console.log(coupon)
            // Mark the coupon as used by the user
            user.usedCoupons.push(coupon._id);
            await user.save();
    
         }

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
        console.error("Error in place order",err);
        next(error)
    }
};

// Repayment 
const rePayment = async (req, res,next) => {
    try {
        const { orderId } = req.params;

        // Find the order
        const order = await Order.findById(orderId );

        // Check if the order exists and is eligible for repayment
        if (!order || order.paymentMethod !== 'Razorpay' || order.paymentStatus !== 'Pending') {
            return res.status(400).json({ success: false, message: 'Order is not eligible for repayment.' });
        }

        // Create a new Razorpay order
        const razorpayOrder = await razorpay.orders.create({
            amount: order.finalAmount * 100, // Amount in smallest currency unit (paise)
            currency: 'INR',
            receipt: `order_rcptid_${new Date().getTime()}`,
        });

        // Update the existing order with the new Razorpay order ID
        order.razorpayOrderId = razorpayOrder.id;
        await order.save();

        // Send the new order details to the frontend
        return res.json({
            success: true,
            razorpayOrderId: razorpayOrder.id,
            amount: razorpayOrder.amount,
            currency: razorpayOrder.currency,
        });
    } catch (error) {
        console.error('Error in repay:', error);
        next(error)
    }
};

//verify payment
const verifyPayment = async (req, res,next) => {
    try {
        

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
      return res.json({ success: true ,message:"Your payment has been successfully verified." });
    } else {
        await Order.findByIdAndUpdate(orderId, {
            paymentStatus:"Failed"   // Update payment status to Failed
            
          });
      return res.json({ success: false ,message:'Invalid signature, payment verification failed' });
    }
} catch (error) {
    console.log('Error in verifyPayment',error)
    next(error)
        
}
  };



const getOrders = async (req, res,next) => {
    try {
        const orders = await Order.find({ userId: req.session.user}).populate('orderedItems.product').sort({createdOn : -1}); // Assuming each order has items with product references
        const user = await User.findOne({_id:req.session.user})
        res.render('user/orders', { orders,user });
    } catch (err) {
        console.error('Error in getOrders',err);
        next(err)
    }
};

const getOrderDetails = async (req,res,next) =>{
    try {
        const user = await User.findById(req.session.user)
        const orderId = req.params.orderId;
     
        
        const order = await Order.findOne({ orderId }).populate('orderedItems.product').populate('address');

        if (!order) {
            return res.status(404).send("Order not found");
        }
        

        res.render('user/order-detail', { order,user });
    } catch (error) {
        console.error('Error in getOrderDetails',error);
        next(error)
    }
}

const cancelOrReturn = async (req,res,next) => {
    const { orderId, action } = req.params;
    const { reason } = req.body;

    try {
        const order = await Order.findOne({ orderId });

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

       
        if (action === 'cancel') {
            order.status = 'Cancel Request';
            order.cancellationReason = reason;
        } else if (action === 'return') {
            order.status = 'Return Request';
            order.returnReason = reason;
        }

        //change individual item status according to order status
        order.orderedItems.forEach(item =>{
            if(item.status !== "Returned" && item.status !== "Cancelled" &&  item.status !== "Return Request" && item.status !== "Cancel Request") {
                if (action === 'cancel') {
                    item.status = 'Cancel Request';
                    
                } else if (action === 'return') {
                    item.status = 'Return Request';
                    
                }
            }
        })

        await order.save();
        res.status(200).json({ message: `Order ${action} Requested successfully` });
    } catch (error) {
        console.log('Error in canceOrReturn',error)
        next(error)
    }
}

const orderSuccess = async(req,res,next) => {
    try {
        res.render('user/order-success')
        
    } catch (error) {
        console.log('Error order success',error)
        next(error)
    }
}

//return or cancel individual item from order details
const cancelSingleItem =  async (req, res,next) => {

    try {
        const { orderId } = req.params;
        const { productId, reason, quantity } = req.body;
        
        const order = await Order.findOne({orderId:orderId});
        if (!order) {
            return res.status(404).send("Order not found");
        }

                 // Find the specific item in orderedItems
    const item = order.orderedItems.find(item => 
        item.product.toString() === productId 
    );
    if (!item) {
        return res.status(404).json({ success: false, message: 'Item not found' });
    }
        


        item.status = "Cancel Request";
        item.cancelReason = reason;
        item.cancelQuantity = quantity;


        await order.save();
        return res.status(200).json({ success: true, message: 'Item cancel requested successfully' });
    } catch (error) {
        console.log('Error in cancel one item',error)
        next(error)
    }
};

const returnSingleItem =  async (req, res,next) => {


    try {
        const { orderId } = req.params;
        const { productId, reason, quantity } = req.body;
        
        const order = await Order.findOne({orderId:orderId});
        if (!order) {
            return res.status(404).send("Order not found");
        }

                 // Find the specific item in orderedItems
    const item = order.orderedItems.find(item => 
        item.product.toString() === productId 
    );
    if (!item) {
        return res.status(404).json({ success: false, message: 'Item not found' });
    }
        


        item.status = "Return Request";
        item.returnReason = reason;
        item.returnQuantity = quantity;


        await order.save();
        return res.status(200).json({ success: true, message: 'Item Return requested successfully' });
    } catch (error) {
        console.log('Error in return reqest single item',error)
        next(error)
    }
};

const getCancelItem = async (req, res) => {
try {
    const { orderId } = req.params;
    const { productId } = req.query;

    const order = await Order.findOne({orderId:orderId});
    if (!order) {
        return res.status(404).send("Order not found");
    }
    
    // Find the specific item in orderedItems
    const item = order.orderedItems.find(item => 
            item.product.toString() === productId 
        );
        if (!item) {
            return res.status(404).json({ success: false, message: 'Item not found in order' });
        }

        
    const product = await Product.findById(item.product)
    if(!product){
        return res.status(404).send("product Image not found");
    }
    const productImage = product.productImage[0];
    const productName = product.productName;
    const quantity = item.quantity;

    // Fetch the order and item details from the database
    // Render the cancel item page with the orderId and itemId
    res.render('user/cancel-item', { 
        orderId, 
        productId,
        productImage,
        quantity,
        productName
    
    });
} catch (error) {
    console.log('Error in getCancelItem',error)
    next(error)
}
};

const getReturnItem = async (req, res,next) => {
try {
    const { orderId } = req.params;
    const { productId } = req.query;

    const order = await Order.findOne({orderId:orderId});
    if (!order) {
        return res.status(404).send("Order not found");
    }
    
    // Find the specific item in orderedItems
    const item = order.orderedItems.find(item => 
            item.product.toString() === productId 
        );
        if (!item) {
            return res.status(404).json({ success: false, message: 'Item not found in order' });
        }


    const product = await Product.findById(item.product)
    if(!product){
        return res.status(404).send("product Image not found");
    }
    const productImage = product.productImage[0];
    const productName = product.productName;
    const quantity = item.quantity;
    

    


    res.render('user/return-item',{
        orderId,
        productId,
        productImage,
        quantity,
        productName
    
    });
    
} catch (error) {
    console.log('Error in getReturnItem',error)
    next(error)
}
};


const getWallet = async (req, res,next) => {
    try {
        // Assuming user ID is stored in session
        const userId = req.session.user;
        const user = await User.findById(userId).populate("wallet");

        if (!user || !user.wallet) {
            return res.status(404).json({ message: "Wallet not found" });
        }

                // Sort transactions by date in descending order
                user.wallet.transactions.sort((a, b) => new Date(b.date) - new Date(a.date));

        res.render("user/wallet", {
            user,
            wallet: user.wallet
        });
    } catch (error) {
        console.error("Error fetching wallet:", error);
        next(error)
    }
};

const generateInvoice = async (req, res ,next) => {
    try {
        const { orderId } = req.params;

        // Find the order by ID
        const order = await Order.findOne({ orderId }).populate('orderedItems.product').populate('address');
        console.log('Order : ', order)

        // Check if the order exists and is delivered
        if (!order || order.status !== 'Delivered') {
            return res.status(404).json({ success: false, message: 'Order not found or not delivered.' });
        }

        // Create a PDF document
        const doc = new PDFDocument();

        // Set the response headers
        res.setHeader('Content-disposition', `attachment; filename=invoice_${order.orderId}.pdf`);
        res.setHeader('Content-type', 'application/pdf');

        // Pipe the PDF into the response
        doc.pipe(res);

        // Add content to the PDF
        doc.fontSize(20).text('Invoice', { align: 'center' });
        doc.moveDown();

        doc.fontSize(12).text(`Invoice No: ${order.invoice.invoiceNo}`);
        doc.text(`Invoice Date: ${order.invoice.invoiceDate.toLocaleDateString()}`);
        doc.text(`Order ID: ${order.orderId}`);
        doc.text(`Order Date: ${order.createdOn.toLocaleDateString()}`);
        doc.text(`Total Amount: ₹${order.finalAmount.toFixed(2)}`);
        doc.moveDown();

        doc.text('Ordered Items:', { underline: true });
        order.orderedItems.forEach(item => {
            doc.text(`- ${item.product.productName} (Quantity: ${item.quantity}) - ₹${item.price.toFixed(2)}`);
        });

        doc.moveDown();
        doc.text(`Shipping Address: ${order.address.landMark}, ${order.address.city}, ${order.address.pincode}`);
        doc.text(`Payment Method: ${order.paymentMethod}`);
        doc.text(`Payment Status: ${order.paymentStatus}`);

        // Finalize the PDF and end the stream
        doc.end();
    } catch (error) {
        console.error('Error generating invoice:', error);
        next(error)
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
    cancelSingleItem,
    returnSingleItem,
    getCancelItem,
    getReturnItem,
    getWallet,
    rePayment,
    generateInvoice
}