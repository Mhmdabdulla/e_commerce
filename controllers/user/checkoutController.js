const Cart = require('../../models/cartSchema');
const Address = require('../../models/addressSchema');
const Order = require('../../models/orderSchema')
const User = require('../../models/userSchema')
const Product = require('../../models/productSchema')
// const Coupon = require('../models/coupon');
// const Order = require('../models/order');


const getCheckoutPage = async (req, res) => {
    try {
        const userId = req.session.user;  
        const cart = await Cart.findOne({ userId }).populate('items.productId');
        const addresses = await Address.find({ user:userId });
        const user = await User.findOne({_id:userId})
        

        res.render('user/checkout', { cart, addresses ,user});
    } catch (error) {
        console.error("Error fetching checkout page data: ", error);
        res.status(500).send("Internal Server Error");
    }


}

const placeOrder = async (req,res) =>{
    try {
        const { selectedAddress, paymentMethod } = req.body;

        if (paymentMethod !== 'Cash on Delivery') {
            return res.status(400).send("Only cash on delivery available");
        }

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

        const newOrder = new Order({
            userId,
            orderedItems,
            totalPrice: cart.totalPrice,
            finalAmount: cart.totalPrice,  // No discount in COD
            address: selectedAddress,
            status: 'Pending',
            couponApplied: false,  // Assuming coupon is not used in COD
        });

        await newOrder.save();

        const user = await User.findOne({_id:userId})

        // Clear the user's cart after placing order
        await Cart.findOneAndUpdate({ userId }, { items: [], totalPrice: 0 });

        // Redirect to the success page after order is placed
        res.render('user/order-success',user);

    } catch (err) {
        console.error(err);
        res.status(500).send("Server error");
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



module.exports = {
    getCheckoutPage,
    placeOrder,
    getOrders,
    getOrderDetails,
    cancelOrReturn,

}