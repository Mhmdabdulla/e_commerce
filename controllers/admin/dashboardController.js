const Order = require('../../models/orderSchema')
const moment = require('moment')






const getDashboard = async (req, res, next) => {
    try {

        // Get filter from query
        const filter = req.query.filter || 'yearly';
        let dateFilter = {}; 
        const currentDate = new Date();
  
        // Filter based on time frame
        if (filter === 'yearly') {
          dateFilter.createdAt = { $gte: new Date(currentDate.getFullYear(), 0, 1) };
        
        } else if (filter === 'monthly') {
          dateFilter.createdAt = { $gte: new Date(currentDate.getFullYear(), currentDate.getMonth(), 1) };
        } else if (filter === 'weekly') {
          const weekStart = new Date(currentDate.setDate(currentDate.getDate() - currentDate.getDay()));
          dateFilter.createdAt = { $gte: weekStart };
        }
 
        // Fetch orders
        const orders = await Order.find(dateFilter).populate('userId');




 // Calculate total sales count, order amount, and discounts
 const totalSalesCount = orders.length; // Count of orders on current page

 const totalOrderAmount = orders.reduce((acc, order) => {

     return acc + order.finalAmount;
 }, 0);

 const totalDiscount = orders.reduce((acc, order) => acc + (order.discount || 0), 0).toFixed(2);

 const today = moment().startOf('day'); // Get today's date (start of the day)

 // Filter orders placed today
 const todayOrders = orders.filter(order => moment(order.invoice.invoiceDate).isSame(today, 'day'));
 
 // Calculate total amount for today's orders
 const todayOrderAmount = todayOrders.reduce((acc, order) => {
     return acc + order.finalAmount
 }, 0).toFixed(2);
 
  
        // Aggregate sales data for charts
       
let salesData
if(filter ==="monthly" || filter ==="weekly"){
         salesData = await Order.aggregate([
          { $match: dateFilter },
          {
              $group: {
                  _id: {
                      year: { $year: "$createdAt" },
                      month: { $month: "$createdAt" },
                      day: { $dayOfMonth: "$createdAt" } // Keep this for daily data
                  },
                  totalSales: { $sum: "$finalAmount" },
                  totalOrders: { $sum: 1 }
              }
          },
          { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } }
      ]);
      
    }else{
       salesData = await Order.aggregate([
        { $match: dateFilter },
        {
            $group: {
                _id: {
                    year: { $year: "$createdAt" },
                    month: { $month: "$createdAt" },
                },
                totalSales: { $sum: "$finalAmount" },
                totalOrders: { $sum: 1 }
            }
        },
        { $sort: { "_id.year": 1, "_id.month": 1 } }
    ]);
    
    }
 
       
        // Best-selling products (Top 10)
        const bestSellingProducts = await Order.aggregate([
          { $unwind: "$orderedItems" },
          { $group: { _id: "$orderedItems.product", totalSold: { $sum: "$orderedItems.quantity" } } },
          { $sort: { totalSold: -1 } },
          { $limit: 10 },
          { $lookup: { from: 'products', localField: '_id', foreignField: '_id', as: 'productDetails' } },
          { $unwind: "$productDetails" }
        ]);

        // Best-selling categories (Top 10)
        const bestSellingCategories = await Order.aggregate([
          { $unwind: "$orderedItems" },
          { $lookup: { from: 'products', localField: 'orderedItems.product', foreignField: '_id', as: 'productDetails' } },
          { $unwind: "$productDetails" },
          { $lookup: { from: 'categories', localField: 'productDetails.category', foreignField: '_id', as: 'categoryDetails' } },
          { $unwind: "$categoryDetails" },
          { $group: { _id: "$categoryDetails._id", name: { $first: "$categoryDetails.name" }, totalSold: { $sum: "$orderedItems.quantity" } } },
          { $sort: { totalSold: -1 } },
          { $limit: 10 }
        ]);
  
        // // Best-selling brands (Top 10)
        // const bestSellingBrands = await Order.aggregate([
        //   { $unwind: "$orderedItems" },
        //   { $lookup: { from: 'products', localField: 'orderedItems.product', foreignField: '_id', as: 'productDetails' } },
        //   { $unwind: "$productDetails" },
        //   { $group: { _id: "$productDetails.brand", totalSold: { $sum: "$orderedItems.quantity" } } },
        //   { $sort: { totalSold: -1 } },
        //   { $limit: 10 }
        // ]);
  
        res.render('admin/dashboard', {
        
          orders,
          bestSellingProducts,
          bestSellingCategories,
        //   bestSellingBrands,
          salesData,  // Passing sales data for the chart
          filter ,     // Passing filter to adjust the chart rendering
          totalSalesCount,
          totalOrderAmount,
          totalDiscount,
          todayOrderAmount
        });
      
    } catch (error) {
      console.error('Error loading dashboard:', error);
      next(error)
    }
  };



  

module.exports ={
    getDashboard
}