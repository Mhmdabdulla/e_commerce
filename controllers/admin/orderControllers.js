const Order = require('../../models/orderSchema')




const getOrderList = async (req, res) => {
    try {
        const search = req.query.search || '';
        const page = req.query.page || 1;
        const limit = 4;

        const orders = await Order.find({
            orderId : {$regex:new RegExp(".*"+search+".*","i")}
        })
            .populate('userId')
            .populate('orderedItems.product')
            .sort({ createdOn: -1 }) // Sorting by latest orders
            .limit(limit*1)
            .skip((page-1)*limit)
            .exec();
        
            const count = await Order.find({
                orderId : {$regex:new RegExp(".*"+search+".*","i")}
            }).countDocuments();

        res.render('admin/order-list', {
             orders,
             currentPage : page,
            totalPages : Math.ceil(count/limit)
             });
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
};

const getOrderDetails = async (req, res) => {
    try {
        const orderId = req.params.orderId;
        const order = await Order.findOne({ orderId })
            .populate('userId')
            .populate('orderedItems.product')
            .populate('address');

        if (!order) {
            return res.status(404).send('Order not found');
        }
      

        res.render('admin/order-detail', { order });
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
};


const changeOrderStatus = async (req,res) => {
    const { orderId, status } = req.body;

    try {
        // Find the order by orderId
        const order = await Order.findOne({ orderId });
        
        if (!order) {
            return res.status(404).send("Order not found");
        }

        // Update the order status
        order.status = status;

        // Save the updated order
        await order.save();

        // Send success response
        res.status(200).send("Order status updated successfully");
    } catch (error) {
        console.error(error);
        res.status(500).send("Error updating order status");
    }
}


module.exports = {

    getOrderList,
    getOrderDetails,
    changeOrderStatus
}