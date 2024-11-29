const PDFDocument = require("pdfkit");
const ExcelJS = require("exceljs");
const moment = require("moment");
const Order = require("../../models/orderSchema");


// Generate sales report data
const getSalesData = async (search, dateFilter, startDate, endDate) => {
   
  let query = {
      status: 'Delivered' 
  };

  // Search filters 
  if (search) {
      query.$or = [
          { orderId: { $regex: search, $options: 'i' } },
          { 'userId.email': { $regex: search, $options: 'i' } }
      ];
  }

  


  if (dateFilter) {
      const now = moment(); // Get current time
      if (dateFilter === 'daily') {
          query.createdOn = { $gte: now.startOf('day').toDate(), $lt: now.endOf('day').toDate() };
      } else if (dateFilter === 'weekly') {
          query.createdOn = { $gte: now.startOf('week').toDate(), $lt: now.endOf('week').toDate() };
      } else if (dateFilter === 'monthly') {
          query.createdOn = { $gte: now.startOf('month').toDate(), $lt: now.endOf('month').toDate() };
      } else if (dateFilter === 'yearly') {
          query.createdOn = { $gte: now.startOf('year').toDate(), $lt: now.endOf('year').toDate() };
      } else if (dateFilter === 'custom' && startDate && endDate) {
          const start = moment(startDate).startOf('day');
          const end = moment(endDate).endOf('day'); // Include the entire end date
          if (start.isValid() && end.isValid()) {
              query.createdOn = { $gte: start.toDate(), $lte: end.toDate() }; // Using $lte to include the full end date
          } else {
              console.error('Invalid date range');
          }
      } else if (dateFilter === 'custom' && startDate && !endDate) {
          const singleDate = moment(startDate);
          if (singleDate.isValid()) {
              query.createdOn = {
                  $gte: singleDate.startOf('day').toDate(),
                  $lt: singleDate.endOf('day').toDate()
              };
          } else {
              console.error('Invalid single date');
          }
      }
  }
  


  return await Order.find(query)
      
      .populate( 'orderedItems.product', 'productName' )
      .lean();
};



  

  const getSalesReport = async (req, res,next) => {
    try {
       
      const { search = "", dateFilter, startDate, endDate } = req.query; // Search query from the user
    
      const page = parseInt(req.query.page) || 1; // Current page number
      const limit = 10; // Limit of orders per page
      const orders = await getSalesData(search, dateFilter, startDate, endDate);
    


// Construct the download URLs using req.query
const pdfUrl = `/admin/salesreport/pdf?${new URLSearchParams(req.query).toString()}`;
const excelUrl = `/admin/salesreport/excel?${new URLSearchParams(req.query).toString()}`;


     
      // // Check if there are no results
      const noResults = orders.length === 0;


      // Pagination logic
      const totalFilteredCount = orders.length;
      const totalPages = Math.ceil(totalFilteredCount / limit);
      const paginatedData = orders.slice((page - 1) * limit, page * limit); // Get the current page data

      // Calculate total sales count, order amount, and discounts
      const totalSalesCount = orders.length; // Count of orders on current page

      const totalOrderAmount = orders.reduce((acc, order) => acc+order.finalAmount, 0);

      const totalDiscount = orders.reduce((acc, order) => acc + (order.discount || 0), 0);

      res.render('admin/sales-report', {
          data: paginatedData,
          currentPage: page,
          totalPages: totalPages,
          search,
          noResults,
          totalSalesCount,
          totalOrderAmount,
          totalDiscount,
          pdfUrl,
          excelUrl
      });
  } catch (error) {
      console.error('Error fetching orders:', error);
      next(error)
  }

};
const downloadPDF = async (req, res, next) => {
  try {
      const { search = "", dateFilter, startDate, endDate } = req.query; // Search query from the user
      const orders = await getSalesData(search, dateFilter, startDate, endDate); // Fetch data based on filters
      
      // console.log('Filtered Orders:', orders);

      const totalSalesCount = orders.length; // Count of orders on current page

      const totalOrderAmount = orders.reduce((acc, order) => acc + order.finalAmount, 0);

      const totalDiscount = orders.reduce((acc, order) => acc + (order.discount || 0), 0);

      const doc = new PDFDocument();
      res.setHeader('Content-Disposition', 'attachment; filename=sales_report.pdf');
      res.setHeader('Content-Type', 'application/pdf');
      doc.pipe(res);

      // Set title
      doc.fontSize(16).text('Sales Report', { align: 'center' }).moveDown(1);


      doc.fontSize(13).text('Sales Overview', { align: 'left' }).moveDown(1);

       // Add the total overview at the top
       doc.fontSize(12).text(`Total Sales Count: ${totalSalesCount}`, { align: 'left' });
       doc.text(`Total Order Amount: Rs ${totalOrderAmount.toFixed(2)}`, { align: 'left' });
       doc.text(`Total Discount: Rs ${totalDiscount.toFixed(2)}`, { align: 'left' }).moveDown(1);


       doc.fontSize(13).text('Sales OrderList', { align: 'left' }).moveDown(1);


      // Set column headers with alignment
      const headers = ['Order ID', 'Invoice Date', 'Items', 'Total Price', 'Total Discount', 'Status', 'Payment Method', 'Payment Status'];
      const columnWidths = [80, 60, 40, 60, 60, 60, 80, 80]; // Set column widths

      let startX = 50; // Starting position for table
      let startY = doc.y; // Y-coordinate to maintain current position
      const pageHeight = doc.page.height;
      const marginBottom = 50;

              // Helper function to check for page break
              const checkPageBreak = () => {
                if (doc.y + 20 > pageHeight - marginBottom) {
                    doc.addPage();
                    startY = doc.y; // Reset Y position on the new page
                    drawHeaders(); // Redraw headers on the new page
                }
            };

      // Draw table headers
      headers.forEach((header, i) => {
          doc.fontSize(10).text(header, startX, startY, { width: columnWidths[i], align: 'center' });
          startX += columnWidths[i]; // Move x position to next column
      });

      doc.moveDown(1); // Move down before table data

      // Add table data
      orders.forEach(order => {
          const row = [
              order.orderId,
              new Date(order.invoice.invoiceDate).toLocaleDateString(),
              order.orderedItems.reduce((total, item) => total + item.quantity, 0),
              order.orderedItems.reduce((total, item) => total + item.price * item.quantity, 0).toFixed(2),
              order.discount.toFixed(2),
              order.status,
              order.paymentMethod,
              order.paymentStatus,
          ];

          startX = 50; // Reset x position for each row
          startY = doc.y; // Get the current Y position for each new row

          row.forEach((item, i) => {
              doc.text(item, startX, startY, { width: columnWidths[i], align: 'center' });
              startX += columnWidths[i];
          });

          doc.moveDown(3); // Add some space between rows
      });

      // Finalize the PDF
      doc.end();
  } catch (error) {
      console.error('Error generating PDF:', error);
    next(error)
  }
};


const downloadExcel = async (req, res, next) => {
  try {
      const { search, dateFilter, startDate, endDate } = req.query; // Get filters from query
      const orders = await getSalesData(search, dateFilter, startDate, endDate); // Fetch data based on filters


      const totalSalesCount = orders.length; // Count of orders on current page

      const totalOrderAmount = orders.reduce((acc, order) => acc + order.finalAmount, 0);

      const totalDiscount = orders.reduce((acc, order) => acc + (order.discount || 0), 0);

      const doc = new PDFDocument();


      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Sales Report');


      // Add the total overview at the top
      worksheet.addRow(['Sales Overview']);
      worksheet.addRow([`Total Sales Count: ${totalSalesCount}`]);
      worksheet.addRow([`Total Order Amount: Rs ${totalOrderAmount.toFixed(2)}`]);
      worksheet.addRow([`Total Discount: Rs ${totalDiscount.toFixed(2)}`]);
      worksheet.addRow([]); // Empty row for spacing

      // Add table headers
      const headers = ['Order ID', 'Invoice Date', 'Items', 'Total Price', 'Total Discount', 'Status', 'Payment Method', 'Payment Status'];
      worksheet.addRow(headers);

      // Add table data
      orders.forEach(order => {
          const row = [
              order.orderId,
              new Date(order.invoice.invoiceDate).toLocaleDateString(),
              order.orderedItems.reduce((total, item) => total + item.quantity, 0),
              order.orderedItems.reduce((total, item) => total + item.price * item.quantity, 0),
              order.discount,
              order.status,
              order.paymentMethod,
              order.paymentStatus,
          ];
          worksheet.addRow(row);
      });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=sales-report.xlsx');
      await workbook.xlsx.write(res);
      res.end();
  } catch (error) {
      console.error('Error generating Excel:', error);
     next(error)
  }
};



module.exports = {
    getSalesReport,
    downloadPDF,
    downloadExcel
}