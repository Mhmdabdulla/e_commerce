const express = require('express')
const router = express.Router()
const userController = require('../controllers/user/userControllers')
const userProfile = require('../controllers/user/userProfile')
const cartControllers = require('../controllers/user/cartControllers')
const checkoutController = require('../controllers/user/checkoutController')
const wishlistController = require('../controllers/user/whishlistControllers')
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
router.get('/cart/item-count',userAuth,cartControllers.cartItemCount)
    // Update cart quantity
router.put('/cart/update',userAuth, cartControllers.updateCartQuantity);
    // Remove product from cart
router.delete('/cart/remove', userAuth,cartControllers.removeFromCart);



//checkout handling

// Get checkout page
router.get('/checkout', userAuth, checkoutController.getCheckoutPage);
// Apply coupon
// router.post('/checkout/apply-coupon', userAuth, checkoutController.applyCoupon);

// Place order
router.post('/checkout/place-order', userAuth, checkoutController.placeOrder);
router.post("/checkout/verify-payment", userAuth, checkoutController.verifyPayment)
router.get('/order-success',userAuth,checkoutController.orderSuccess)
router.get('/orders' , userAuth,checkoutController.getOrders)
router.get('/orders/:orderId',userAuth,checkoutController.getOrderDetails)
router.post('/orders/:orderId/:action',userAuth,checkoutController.cancelOrReturn)

//whish list
router.get('/wishlist', userAuth, wishlistController.getWishlist);
router.post('/wishlist/add', userAuth, wishlistController.addToWishlist);
router.delete('/wishlist/remove', userAuth, wishlistController.removeFromWishlist);




module.exports = router