const express = require('express')
const router = express.Router()
const userController = require('../controllers/user/userControllers')
const userProfile = require('../controllers/user/userProfile')
const cartControllers = require('../controllers/user/cartControllers')
const checkoutController = require('../controllers/user/checkoutController')
const {userAuth, adminAuth} = require('../middlewares/auth')

const passport = require('passport')



router.get('/',userController.loadHomePage)
router.get('/pageNotFount',userController.pageNotFound)
router.get('/signup',userController.loadSignup)
router.post('/signup',userController.signUp)
router.get('/login', userController.loadLogin)
router.post('/login',userController.login)
router.post('/verifyotp',userController.verifyOtp)
router.post('/resend-otp',userController.resendOtp)
router.get('/logout',userController.logout)




  
router.get('/auth/google',passport.authenticate('google',{scope : ['profile','email']}));
router.get('/auth/google/callback',passport.authenticate('google',{failureRedirect:'/signup'}),
(req,res)=>{
    req.session.user = req.user._id;
    res.redirect('/')

});

//products
router.get('/products',userController.loadProducts)
router.get('/productDetails',userController.loadProductDetails)

//user profie
router.get('/profile',userAuth,userProfile.loadProfile)
router.get('/address',userAuth,userProfile.loadAddress)
router.get('/address/:id',userAuth,userProfile.getSingleAddress)
router.post('/address/add',userAuth,userProfile.addAddress)
router.post('/address/edit/:id',userAuth,userProfile.editAddress)
router.post('/address/delete/:id',userAuth,userProfile.deleteAddress)
router.post('/user/update-profile',userAuth,userProfile.updateProfile)
router.post('/user/change-password',userAuth,userProfile.changePassword)

//cart
router.get('/cart',userAuth,cartControllers.listCart)
router.post('/cart/add',userAuth,cartControllers.addToCart)
    // Update cart quantity
router.put('/cart/update',userAuth, cartControllers.updateCartQuantity);
    // Remove product from cart
router.delete('/cart/remove', userAuth,cartControllers.removeFromCart);

//search handling
router.get('/search',userController.searchResult)
router.post('/filter-products',userController.filterProducts)


//checkout handling

// Get checkout page
router.get('/checkout', userAuth, checkoutController.getCheckoutPage);
// Apply coupon
// router.post('/checkout/apply-coupon', userAuth, checkoutController.applyCoupon);
// Add new address
// router.post('/checkout/add-address', userAuth, checkoutController.addNewAddress);
// Place order
router.post('/checkout/place-order', userAuth, checkoutController.placeOrder);
router.get('/orders' , userAuth,checkoutController.getOrders)
router.get('/order/:orderId',userAuth,checkoutController.getOrderDetails)


module.exports = router