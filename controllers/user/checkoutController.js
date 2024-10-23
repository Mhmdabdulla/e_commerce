const Cart = require('../../models/cartSchema');
const Address = require('../../models/addressSchema');
const Order = require('../../models/orderSchema')
const User = require('../../models/userSchema')
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
        console.log(orderId)
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

module.exports = {
    getCheckoutPage,
    placeOrder,
    getOrders,
    getOrderDetails
}