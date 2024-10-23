

const User = require('../../models/userSchema')
const Product = require('../../models/productSchema')
const Category = require('../../models/categorySchema')
const nodemailer = require('nodemailer')
const env = require('dotenv').config()
const bcrypt = require('bcrypt')
const mongoose = require('mongoose');




const loadHomePage = async (req,res)=>{
    try {
        const user = req.session.user
        const categories = await Category.find({isListed:true})
        let productData = await Product.find({
            isBlocked:false,
            category : {$in:categories.map(category => category._id)},
            // quantity : {$gt:0}

        })
        productData.sort((a,b)=>new Date(b.createdOn)-new Date(a.createdOn))
        productData = productData.slice(0,8)
        
        
        if(user){
            const userData = await User.findOne({_id:user})
            res.render('user/home',{user:userData , products:productData})
        }else{
            return res.render('user/home',{products:productData})
        }

        
        
    } catch (error) {
        console.log('home page not found',error)
        res.status(500).send('server error when loading homepage')
    }
}
const pageNotFound = async (req,res)=>{
    try {
       return res.render('user/404_error')
        
    } catch (error) {
        console.log('page not found',error)
        res.status(500).send('server error when loading page')
        
    }
}
const loadSignup = async (req,res)=>{
    try {
        return res.render('user/sign_up')
        
    } catch (error) {
        console.log('page not found',error)
        res.status(500).send('server error when loading page')
        
    }
}

const generateOtp =()=>{
    
 return Math.floor(100000 + Math.random()*900000).toString();
}

 async function sendVerificationEmail(email,otp){
   
 try {
    const transporter = nodemailer.createTransport({
        service : 'gmail',
        port : 587,
        secure : false,
        requireTLS :true,
        auth : {
            user : process.env.NODEMAILER_EMAIL,
            pass : process.env.NODEMAILER_PASSWORD
        }
     })
     const info = await transporter.sendMail({
        from : process.env.NODEMAILER_EMAIL,
        to : email,
        subject : 'verify your account',
        text : `your OTP is ${otp}`,
        html : `<b>Your OTP : ${otp}</b>`
     })
    return info.accepted.length > 0
 } catch (error) {
    console.error('error when sending otp',error)
    return false;
    
 }

}

const signUp = async (req,res)=>{
    
    try {
        
        const {name , email,phone , password ,cpassword} = req.body;
     
        if(password !== cpassword){
            return res.render('user/sign_up',{message : 'password donot match'})
        }
        
        

        const findUser = await User.findOne({email})
        if(findUser){
            console.log('user exist')
            return res.render('user/sign_up',{message : 'this email allready exist'})
        }
            
        const otp = generateOtp();
        

        const emailSent = await sendVerificationEmail(email,otp)

        if(!emailSent){
            return res.json('email error')
        }

        req.session.userOtp = otp;
        req.session.user = {name,email,phone,password}

        res.render('user/verify_otp')
        console.log('OTP send',otp)

        
    } catch (error) {
        console.error('sign up error',error)
        res.redirect('/pageNotFount')
    }
}


const loadLogin = async (req,res)=>{
    try {
        if(!req.session.user){
            return res.render('user/login')
        }else{
            res.redirect('/')
        }
    } catch (error) {

        res.redirect('/pageNotFound')
    }
}

const login = async (req,res)=>{
    try {
        const {email ,password} = req.body;
        const findUser =await User.findOne({isAdmin:0,email:email})
       

        if(!findUser){
            return res.render('user/login',{message : 'user not found'})
        }
        if(findUser.isBlocked){
            return res.render('user/login',{message : 'user is blocked by admin'})
        }
        
        const passwordMatch = await bcrypt.compare(password,findUser.password)
        
        

        if(!passwordMatch){
            return res.render('user/login',{message : 'password is incorrect'})
        }
          // Store  necessary user information in session 
        req.session.user = findUser._id;
        
        
        res.redirect('/')

    } catch (error) {
        console.error('error when login',error)
        res.render('user/login',{message : 'login failed , pls try again later'})

        
    }
}

//logout
const logout = async(req,res)=>{
    try {
        req.session.destroy((err)=>{
            if(err){
              console.log('session destruction error',error)
              return res.redirect('/pageNotFound')
            }
            return res.redirect('/')
        })
        
    } catch (error) {
        console.log('error occur when logout',logout)
        res.redirect('/pageNotFound')
    }
}

const securePassword = async function(password) {
    try {
        const passwordHash = await bcrypt.hash(password,10);
        return passwordHash
        
    } catch (error) {
        console.log('error when securing the password(hash)',error)
    }
    
}

const verifyOtp = async function(req,res) {
    try {
        const {otp} = req.body;
        console.log('otp from user',otp)

        if(otp === req.session.userOtp){
            const userDeatils = req.session.user
            //password hashing for security using bcrypt
            const passwordHash = await securePassword(userDeatils.password)

            const userData = new User({
                name : userDeatils.name,
                email : userDeatils.email,
                phone : userDeatils.phone,
                password : passwordHash
            })
            await userData.save();
            req.session.user = userData._id;
            res.json({success : true , redirectUrl : "/"})
            
            
        }else {
            res.status(400).json({success : false  , message : 'invalid OTP , please try again'})
        }


        
    } catch (error) {
  
        console.error('error vrifying otp',error)
        res.status(500).json({success:false, message:'an error occur when verifying otp'})
    }
}

const resendOtp =async(req,res)=>{
    try {
        const{email} = req.session.user;
        if(!email){
            return res.status(400).json({success : false,message : 'Email not found in session'})
        }

        const otp = generateOtp()
        req.session.userOtp = otp;

        const emailSent = await sendVerificationEmail(email,otp)
        if(emailSent){
            console.log('Resend OTP',otp)
            res.status(200).json({success : true, message: 'OTP Resend succesfully'})
        }else{
            res.status(500).json({success : false, message :"failed to resend OTP , please try again"})
            
        }
        
    } catch (error) {
        console.error('error resending otp',error)
        res.status(500).json({success:false, message:'an error occur when resending otp'})
    }
}

const loadProducts = async (req,res)=>{
    try {
        const user = req.session.user
       
        const categories = await Category.find({isListed:true})
        let productData = await Product.find({
            isBlocked:false,
            category : {$in:categories.map(category => category._id)},
            // quantity : {$gt:0}

        })
        productData.sort((a,b)=>new Date(b.createdOn)-new Date(a.createdOn))
        productData = productData.slice(0,8)
        
        
        if(user){
            const userData = await User.findOne({_id:user})
            
            res.render('user/products',{user:userData , products:productData})
        }else{
            return res.render('user/products',{products:productData})
        }

    } catch (error) {
        console.log('error when loading product page',error)
        res.redirect('/pageNotFound')
    }
}

const loadProductDetails = async (req,res)=>{
    try {
       const {productId , categoryId}= req.query;
       
 // Validate the product ID
//  if (!productId || !productId.match(/^[0-9a-fA-F]{24}$/)) {
//     return res.status(400).send('Invalid Product ID.');
// }

        // Validate the product ID
        if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
            return res.status(400).send('Invalid Product ID.');
        }

// Fetch the product from the database
const product = await Product.findById(productId).populate('category'); // Populate if category is a reference

if (!product) {
    return res.status(404).send('Product not found.');
}
const relatedProducts = await Product.find({
    category: categoryId,
    _id: { $ne: productId }
})
.select('productName salePrice productImage _id category productOffer')
.limit(4)
.sort({ salePrice: -1 })
.exec();

// Transform to include only the first image
const transformedRelatedProducts = relatedProducts.map(prod => ({
    productName: prod.productName,
    _id : prod._id,
    category : prod.category,
    salePrice: prod.salePrice,
    productOffer: prod.productOffer,
    image: prod.productImage[0] || 'img/product-1.jpg' // Handle cases where productImage might be empty
}));

//finding user for nav bar
const user = req.session.user
if(user){
    const userData = await User.findOne({_id:user})
// Render the product details page with the product data
res.render('user/product-details', { product ,user:userData,relatedProducts : transformedRelatedProducts});
}else{
    // Render the product details page with the product data
res.render('user/product-details', { product ,relatedProducts : transformedRelatedProducts});
}



    } catch (error) {
       console.log('error loading product details',error)
       res.redirect('/pageNotFound') 
    }
}

const searchResult = async (req,res) => {
    try {
        const query = req.query.query;
        let products = [];
        if (query) {
            // Modify this logic to suit your database structure
            products = await Product.find({ productName: new RegExp(query, 'i') });
        }
        res.render('user/searchResults', { products });
    } catch (error) {
        
    }
}

const filterProducts = async (req, res) => {
    try {
        const categoryFilter = req.body.category || '';  //Selected category
        const sortFilter = req.body.sort || 'newest'; // Sorting criteria

        // Fetch filtered products
        let productData = await Product.find({
            isBlocked: false,
            category: categoryFilter ? categoryFilter : { $exists: true }
        });
        console.log(productData)
        console.log(sortFilter)

        // Apply sorting
        if (sortFilter === 'low-to-high') {
            productData.sort((a, b) => a.salePrice - b.salePrice);
        } else if (sortFilter === 'high-to-low') {
            productData.sort((a, b) => b.salePrice - a.salePrice);
        } else if (sortFilter === 'a-z') {
            productData.sort((a, b) => a.productName.localeCompare(b.productName));
        } else if (sortFilter === 'z-a') {
            productData.sort((a, b) => b.productName.localeCompare(a.productName));
        } else if (sortFilter === 'popularity') {
            productData.sort((a, b) => b.rating - a.rating); // Assuming rating field
        } else {
            productData.sort((a, b) => new Date(b.createdOn) - new Date(a.createdOn));
        }

        res.json({ products: productData });
    } catch (error) {
        console.log('Error filtering products', error);
        res.status(500).json({ message: 'Failed to filter products' });
    }
};


module.exports = {
    loadHomePage,
    pageNotFound,
    loadSignup,
    signUp,
    loadLogin,
    verifyOtp,
    resendOtp,
    login,
    logout,
    loadProducts,
    loadProductDetails,
    searchResult,
    filterProducts
}