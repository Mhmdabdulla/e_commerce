const Order = require("../../models/orderSchema");
const User = require("../../models/userSchema");
const Wallet = require("../../models/walletSchema");
const Product = require("../../models/productSchema");

const getOrderList = async (req, res, next) => {
  try {
    const search = req.query.search || "";
    const page = req.query.page || 1;
    const limit = 4;

    // Build the search filter (e.g., search by orderId or user email)
    const searchFilter = {
      $or: [
        { orderId: { $regex: new RegExp(".*" + search + ".*", "i") }}, // Search by orderId
        { "userId.email": { $regex: search, $options: "i" } }, // Search by user email
      ],
    };


    const orders = await Order.find(searchFilter)
      .populate("userId")
      .populate("orderedItems.product")
      .sort({ createdOn: -1 }) // Sorting by latest orders
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const count = await Order.countDocuments(searchFilter);

    res.render("admin/order-list", {
      orders,
      currentPage: page,
      totalPages: Math.ceil(count / limit),
    });
  } catch (error) {
    console.error("Error in getOrderList", error);
    next(error);
  }
};

const getOrderDetails = async (req, res, next) => {
  try {
    const orderId = req.params.orderId;
    const order = await Order.findOne({ orderId })
      .populate("userId")
      .populate("orderedItems.product")
      .populate("address");

    if (!order) {
      return res.status(404).send("Order not found");
    }

    res.render("admin/order-detail", { order });
  } catch (error) {
    console.error("Error in getOrderDetails", error);
    next(error);
  }
};

const changeOrderStatus = async (req, res, next) => {
  const { orderId, status } = req.body;

  try {
    // Find the order by orderId
    const order = await Order.findOne({ orderId });

    if (!order) {
      return res.status(404).send("Order not found");
    }

    //refund amount if payment is completed when confirming the return or cancel request by admin
    if (
      (status == "Cancelled" || status == "Returned") &&
      order.paymentStatus == "Completed"
    ) {
      const refundAmount = order.finalAmount;

      // Find the user's wallet
      const user = await User.findById(order.userId);
      if (user && user.wallet) {
        const wallet = await Wallet.findById(user.wallet);

        // Update wallet balance and add transaction
        wallet.balance += refundAmount;
        wallet.transactions.push({
          type: "credit",
          amount: refundAmount,
          description: `Refund for ${status}ed order ${orderId}`,
          date: new Date(),
        });

        await wallet.save(); // Save updated wallet
        order.paymentStatus = "Refunded";
      } else {
        return res.status(404).send("user not found");
      }
    }

    if (order.paymentMethod == "COD" && status === "Delivered") {
      order.paymentStatus = "Completed";
    }

    //updating individual items
    order.orderedItems.forEach((item) => {
      if (item.status !== "Returned" && item.status !== "Cancelled") {
        item.status = status;
      } else {
        item.status = item.status;
      }
    });

    // Update the order status
    order.status = status;

    if (status == "Cancelled" || status == "Returned") {
      // Update stock for each product in the order
      for (let item of order.orderedItems) {
        const product = await Product.findById(item.product);

        if (product) {
          product.stock += item.quantity; // Increment stock by the quantity ordered
          await product.save(); // Save the updated product
        }
      }
    }

    // Save the updated order
    await order.save();

    // Send success response
    res.status(200).send("Order status updated successfully");
  } catch (error) {
    console.error("Error in changeOrderStatus", error);
    next(error);
  }
};

//verfying the return or cancel requests
const changeItemStatus = async (req, res, next) => {
  const { orderId, productId, status } = req.body;

  try {
    // Find the order by orderId
    const order = await Order.findOne({ orderId });

    if (!order) {
      return res.status(404).send("Order not found");
    }

    // Find the item in the orderedItems array
    const item = order.orderedItems.find(
      (i) => i.product.toString() === productId
    );

    if (!item) {
      return res.status(404).send("Item not found in the order ");
    }

    // Update the item status
    item.status = status;

    // finding product for stock management
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).send("product not found in the product dbs ");
    }
    // calculate refundamount which is will decrease from finalAmount of order
    let quantity =
      status == "Cancelled" ? item.cancelQuantity : item.returnQuantity;

    let refundAmount = (item.price / item.quantity) * quantity;

    order.finalAmount -= refundAmount;

    // Handle refund if the item is returned or cancelled and payment is completed
    if (
      (status === "Cancelled" || status === "Returned") &&
      order.paymentStatus === "Completed"
    ) {
      // Find the user's wallet
      const user = await User.findById(order.userId);
      if (user && user.wallet) {
        const wallet = await Wallet.findById(user.wallet);

        // Update wallet balance and add transaction
        wallet.balance += refundAmount;
        wallet.transactions.push({
          type: "credit",
          amount: refundAmount,
          description: `Refund for ${status}ed item ${item.product}`,
          date: new Date(),
        });

        await wallet.save(); // Save updated wallet
      } else {
        return res.status(404).send("User  not found");
      }
    }

    product.stock += quantity; // Increment stock by the quantity returned or canceled
    await product.save(); // Save the updated product

    // Save the updated order
    await order.save();

    // Send success response
    res.status(200).send("Item status updated successfully");
  } catch (error) {
    console.error("Error in changeItemStatus", error);
    next(error);
  }
};

module.exports = {
  getOrderList,
  getOrderDetails,
  changeOrderStatus,
  changeItemStatus,
};
