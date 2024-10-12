const express = require('express')
const router = express.Router()
const userController = require('../controllers/user/userControllers')

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

module.exports = router