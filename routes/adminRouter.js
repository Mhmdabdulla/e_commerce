const express = require('express')
const router = express.Router()
const adminController  = require('../controllers/admin/adminControllers')
const customerControllers = require('../controllers/admin/customerControllers')
const categoryControllers = require('../controllers/admin/categoryControllers')
const productControllers = require('../controllers/admin/productControllers')
const orderControllers = require('../controllers/admin/orderControllers')
const couponController = require('../controllers/admin/couponController')
const salesReportController = require('../controllers/admin/salesReportController')
const {adminAuth} = require('../middlewares/auth')
const multer = require('multer');
const storage = require('../helpers/multer')
const uploads = multer({storage:storage})


router.get('/login',adminController.loadLogin)
router.post('/login',adminController.login)
router.get('/',adminAuth,adminController.loadDashboard)
router.get('/pageerror',adminAuth,adminController.pageError)
router.get('/logout',adminController.logout)

//customers mangement
router.get('/users',adminAuth,customerControllers.customerInfo)
router.get('/blockCustomer',adminAuth,customerControllers.customerBlocked)
router.get('/unblockCustomer',adminAuth,customerControllers.customerunBlocked)
//category management
router.get('/category',adminAuth,categoryControllers.categoryInfo)
router.post('/addCategory',adminAuth,categoryControllers.addCategory)
router.post('/addCategoryOffer',adminAuth,categoryControllers.addCategoryOffer)
router.post('/removeCategoryOffer',adminAuth,categoryControllers.removeCategoryOffer)
router.get('/listCategory',adminAuth,categoryControllers.getListCategory)
router.get('/unlistCategory',adminAuth,categoryControllers.getUnlistCategory)
router.get('/editCategory',adminAuth,categoryControllers.getEditCategory)
router.post('/editCategory/:id',adminAuth,categoryControllers.editCategory)
//product mangement
router.get('/addProducts',adminAuth,productControllers.getProductAddPage)
router.post('/addProducts',adminAuth,uploads.array('images',4),productControllers.addProducts)
router.get('/products',adminAuth,productControllers.getAllProducts)
router.post('/addProductOffer',adminAuth,productControllers.addProductOffer)
router.post('/removeProductOffer',adminAuth,productControllers.removeProductOffer)
router.get('/blockProduct',adminAuth,productControllers.blockProduct)
router.get('/unblockProduct',adminAuth,productControllers.unblockProduct)
router.get('/editProduct',adminAuth,productControllers.getEditProduct)
router.post('/editProduct/:id',adminAuth,uploads.array('images',4),productControllers.editProduct)
router.post('/deleteImage',adminAuth,productControllers.deleteSingleImage)

//handling order management
router.get('/orders',adminAuth, orderControllers.getOrderList);
router.get('/orders/:orderId',adminAuth, orderControllers.getOrderDetails);
router.post('/changeOrderStatus',adminAuth,orderControllers.changeOrderStatus)
router.post('/changeItemStatus', adminAuth , orderControllers.changeItemStatus)

// Routes for creating and deleting coupons 
router.get('/coupon' ,adminAuth,couponController.getCoupon)
router.post('/coupon/create', adminAuth, couponController.createCoupon);
router.put('/coupon/update/:couponId',adminAuth, couponController.updateCoupon);
router.delete('/coupon/delete/:couponId', adminAuth, couponController.deleteCoupon);

//sales report
router.get('/report',adminAuth,salesReportController.getSalesReport)
router.get("/download/pdf",adminAuth, salesReportController.downloadPDF)
router.get("/download/excel" ,adminAuth, salesReportController.downloadExcel)






module.exports = router;