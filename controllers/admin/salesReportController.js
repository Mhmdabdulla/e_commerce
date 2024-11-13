const PDFDocument = require("pdfkit");
const ExcelJS = require("exceljs");
const fs = require("fs");
const path = require("path");
const moment = require("moment");
const Order = require("../../models/orderSchema");


// Generate sales report data
async function generateSalesReport(filter = "daily", startDate, endDate ,orderId,page = 1, limit = 10) {
    const matchStage = { status: "Delivered" }; // Only include delivered orders
  console.log('from gereatesalesreport()',startDate,endDate,filter)
    if (startDate && endDate) {
      matchStage.createdOn = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    } else {
      switch (filter) {
        case "daily":
          matchStage.createdOn = { $gte: moment().startOf("day").toDate() };
          break;
        case "weekly":
          matchStage.createdOn = { $gte: moment().startOf("week").toDate() };
          break;
        case "monthly":
          matchStage.createdOn = { $gte: moment().startOf("month").toDate() };
          break;
      }
    }
        // Filter by Order ID if provided
        if (orderId) {
          matchStage.orderId = { $regex: orderId, $options: 'i' }; // Case-insensitive search
      }
      const skip = (page - 1) * limit;
      console.log('form geratesalesreport',matchStage)
    const report = await Order.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          overallOrderAmount: { $sum: "$finalAmount" },
          overallDiscount: { $sum: "$discount" },
          overallSalesCount: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          overallOrderAmount: 1,
          overallDiscount: 1,
          overallSalesCount: 1,
        },
      },
    ]);
  
    const orderDetails = await Order.find(matchStage)
    .populate("orderedItems.product", "productName")
    .skip(skip)
    .limit(limit);

    // Count total documents
    const totalCount = await Order.countDocuments(matchStage);

  // console.log('Order details from generateSalesRepor()',orderDetails)
  // console.log('reports from generateSalesRepor()',report)
    return {
      report: report[0],
      orderDetails,
      currentPage: page,
      totalPages: Math.ceil(totalCount / limit),
    };
  }



  // PDF Report Generation
  const generatePDFReport = async (filter, startDate, endDate, res) => {
    const { report, orderDetails } = await generateSalesReport(filter, startDate, endDate);
  
    const pdfDoc = new PDFDocument();
  
    // Set the response headers for direct download
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=sales_report.pdf");
  
    pdfDoc.pipe(res); // Pipe the PDF directly to the response
  
    // Add content to the PDF
    pdfDoc.fontSize(20).text("Sales Report", { align: "center" });
    pdfDoc.moveDown().fontSize(12);
    pdfDoc.text(`Overall Order Amount: ₹${report.overallOrderAmount}`);
    pdfDoc.text(`Overall Discount: ₹${report.overallDiscount}`);
    pdfDoc.text(`Overall Sales Count: ${report.overallSalesCount}`);
    pdfDoc.moveDown().fontSize(14).text("Order Details", { align: "center" });
  
    orderDetails.forEach(order => {
      pdfDoc.text(`Order ID: ${order.orderId}`);
      pdfDoc.text(`Date: ${new Date(order.invoiceDate).toLocaleDateString()}`);
      pdfDoc.text(`Total Price: ₹${order.totalPrice}`);
      pdfDoc.text(`Discount: ₹${order.discount}`);
      pdfDoc.text(`Status: ${order.status}`);
      pdfDoc.moveDown();
    });
  
    pdfDoc.end(); // Signal end of PDF document
  };
  
  
  // Excel Report Generation
  const generateExcelReport = async (filter, startDate, endDate, res) => {
    const { report, orderDetails } = await generateSalesReport(filter, startDate, endDate);
  
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Sales Report");
  
    // Set headers for the Excel file
    worksheet.columns = [
      { header: "Order ID", key: "orderId", width: 15 },
      { header: "Invoice Date", key: "invoiceDate", width: 15 },
      { header: "Total Price", key: "totalPrice", width: 15 },
      { header: "Discount", key: "discount", width: 15 },
      { header: "Status", key: "status", width: 15 },
    ];
  
    // Add rows to the worksheet
    orderDetails.forEach(order => {
      worksheet.addRow({
        orderId: order.orderId,
        invoiceDate: new Date(order.invoiceDate).toLocaleDateString(),
        totalPrice: order.totalPrice,
        discount: order.discount,
        status: order.status,
      });
    });
  
    // Set the response headers for direct download
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", "attachment; filename=sales_report.xlsx");
  
    // Write the Excel file directly to the response
    await workbook.xlsx.write(res);
    res.end(); // Signal end of response
  };
  

  const getSalesReport = async (req, res,next) => {
    try {
        const { filter, startDate, endDate ,orderId ,page = 1, limit = 10  } = req.query;
        const reportData = await generateSalesReport(filter, startDate, endDate ,orderId ,parseInt(page), parseInt(limit));

        // If the request is an AJAX call, send HTML for the report
        if (req.xhr) {
          // Render the specific part of the page (the report part)
          res.render("admin/reportPartial", { reportData });
          return; // Exit the function
      }
        // Otherwise, render the full page
     
        res.render("admin/sales-report", { reportData });
   
    } catch (error) {
        console.error('Error generating sales report', error);
        next(error)
        
    }
};
const downloadPDF = async (req,res,next) => {
    try {
        const { filter, startDate, endDate } = req.query;
        generatePDFReport(filter, startDate, endDate, res);

    } catch (error) {
        console.error('Error downloading PDF' , error)
        next(error)
        
    }
}

const downloadExcel = async (req,res,next) => {
    try {
        const { filter, startDate, endDate } = req.query;
        generateExcelReport(filter, startDate, endDate, res);
        
    } catch (error) {
        console.error('Error downloading excel',error)
       next(error)
    }
}


module.exports = {
    getSalesReport,
    downloadPDF,
    downloadExcel
}