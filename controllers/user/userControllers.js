

const User = require('../../models/userSchema')
const Product = require('../../models/productSchema')
const Category = require('../../models/categorySchema')
const Wallet = require('../../models/walletSchema')
const nodemailer = require('nodemailer')
const env = require('dotenv').config()
const bcrypt = require('bcrypt')
const mongoose = require('mongoose');
const crypto = require('crypto');





const loadHomePage = async (req,res,next)=>{
    try {
        const user = req.session.user
        const categories = await Category.find({isListed:true})
        let productData = await Product.find({
            isBlocked:false,
            category : {$in:categories.map(category => category._id)},
           

        }).populate("category" , "name")
        productData.sort((a,b)=>new Date(b.createdOn)-new Date(a.createdOn))
         
        const userData = await User.findOne({_id:user}) || null
         res.render('user/home',{user:userData , products:productData})
  

        } catch (error) {
        console.log('home page not found',error)
        next(error)
    }
}
const pageNotFound = async (req,res,next)=>{
    try {
       return res.render('user/404_error')
        
    } catch (error) {
        console.log('page not found',error)
        next(error)
        
    }
}
const loadSignup = async (req,res,next)=>{
    try {
        return res.render('user/sign_up')
        
    } catch (error) {
        console.log('page not found',error)
        next(error)
        
    }
}

//OTP generation
const generateOtp =()=>{
    
 return Math.floor(100000 + Math.random()*900000).toString();
}

//email verification function
 async function sendVerificationEmail(email,otp){
   
 try {
    const transporter = nodemailer.createTransport({
         service : 'gmail',
        //    port : 587,
        //    secure : false,
        //      requireTLS :true,
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
    console.error('Error sending otp',error)
    return false;
    
 }

}

//Secure password hashing
const securePassword = async function(password) {
    try {
        return await bcrypt.hash(password,10);
        
    } catch (error) {
        console.error('Error hashing password:', error);
        throw new Error('Password hashing failed');
    }
    
}

//Signup function
const signUp = async (req,res,next)=>{
    
    try {
        
        const {name , email,phone , password ,cpassword,referralCode} = req.body;
        console.log(req.body)
     
        if(password !== cpassword){
            return res.render('user/sign_up',{message : "Password do not match"})
        }
        
                // Check if the referral code is valid
                let referrer = null;
                if (referralCode) {
                    referrer = await User.findOne({ referralCode });
                    if (!referrer) {
                        return res.status(400).json({ message: "Invalid referral code." });
                    }
                }
        

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.render('user/sign_up', { message: 'Email already exists' });
        }
            
        const otp = generateOtp();
        const emailSent = await sendVerificationEmail(email,otp)

        if(!emailSent){
            return res.json( {message: 'Failed to send verification email'})
        }

        const hashedPassword = await securePassword(password);
        req.session.userOtp = otp;
        req.session.tempUser = {name,email,phone, password:hashedPassword,referrer:referrer ? referrer : null};
        

        console.log('OTP send',otp)
        res.render('user/verify_otp')
        

        
    } catch (error) {
        console.error('sign up error',error)
        next(error)
    }
}
// Function to generate a random referral code
const generateReferralCode = () => {
    return crypto.randomBytes(3).toString('hex'); // Generates a 6-character hex string
};

//Verify OTP
const verifyOtp = async function(req,res,next) {
    try {
        const {otp} = req.body;
        console.log('OTP from user',otp)
        if(otp === req.session.userOtp){
            const userDeatils = req.session.tempUser;
            // Create a new Wallet for the user
            const wallet = new Wallet({ balance: 0 });
            await wallet.save();
            
            // Add wallet ID to user details
             userDeatils.wallet = wallet._id;

            // Generate a unique referral code
            let referralCode;
            let isUnique = false;

            while (!isUnique) {
                referralCode = generateReferralCode(); // Implement this function to generate a code
                const existingReferral = await User.findOne({ referralCode });
                if (!existingReferral) {
                    isUnique = true; // Found a unique referral code
                }
            }

            userDeatils.referralCode = referralCode;



            const userData = new User(userDeatils);
            await userData.save();
            
            //reward if refrerrer available
            if (userDeatils.referrer){
                const rewardAmount = 10; // Define the reward amount
                await Wallet.findByIdAndUpdate(userData.referrer.wallet, { $inc: { balance: rewardAmount } });
                await Wallet.findByIdAndUpdate(wallet._id, { $inc: { balance: rewardAmount } });
            }
            
            
            
            req.session.user = userData._id;
            delete req.session.tempUser;
            delete req.session.userOtp;

            res.json({success : true , redirectUrl : "/"})
            
            
        }else {
            res.status(400).json({success : false  , message : 'invalid OTP , please try again'})
        }
     } catch (error) {
  
        console.error('Error verifying OTP:', error);
        next(error)
    }
}

//Resend OTP
const resendOtp =async(req,res,next)=>{
    try {
        const{email} = req.session.tempUser;
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
            res.status(500).json({success : false, message :'Failed to resend OTP' })
            
        }
        
    } catch (error) {
        console.error('Error resending OTP:', error);
        next(error)
    }
}


//login function
const loadLogin = async (req,res,next)=>{
    try {
        if(!req.session.user){
            return res.render('user/login')
        }else{
            res.redirect('/')
        }
    } catch (error) {

        console.log('Error in loadLogin',error)
        next(error)
    }
}

const login = async (req,res,next)=>{
    try {
        const {email ,password} = req.body;
        const user =await User.findOne({isAdmin:0,email:email})
       

        if(!user){
            return res.render('user/login',{message : 'User not found'})
        }
        if(user.isBlocked){
            return res.render('user/login',{message : 'User is blocked by admin'})
        }
        
        const passwordMatch = await bcrypt.compare(password,user.password)
        if(!passwordMatch){
            return res.render('user/login',{message : 'Incorrect password'})
        }
          // Store  necessary user information in session 
        req.session.user = user._id;
        res.redirect('/')

    } catch (error) {
        console.error('Login error',error)
        next(error)

        
    }
}

//logout
const logout = async(req,res,next)=>{
    try {
        req.session.destroy((error)=>{
            if (error) {
                console.error('Session destruction error:', error);
                return res.redirect('/pageNotFound');
            }
            res.redirect('/')
        })
        
    } catch (error) {
        console.log('Logout error',error)
        next(error)
    }
}




const loadProducts = async (req, res, next) => {
    try {
      const searchQuery = req.query.searchQuery || "";
      const { sortBy, category } = req.query;
  
      const page = parseInt(req.query.page) || 1;
      const limit = 8;
      const skip = (page - 1) * limit;
  
      let searchCondition = { isBlocked: false };
  
      if (searchQuery.trim() !== "") {
        const regex = new RegExp(searchQuery, "i");
        searchCondition.$or = [{ 
            productName: regex }];
      }
  
      if (category && category !== "") {
        searchCondition.category = category;
      } else {
        const listedCategories = await Category.find({ isListed: true })
          .select("_id")
          .exec();
        const listedCategoryIds = listedCategories.map((cat) => cat._id);
        searchCondition.category = { $in: listedCategoryIds };
      }
  
  
      let sortCriteria = {};
      switch (sortBy) {
        case "popularity":
          sortCriteria = { popularity: -1 };
          break;
        case "priceLowToHigh":
          sortCriteria = { salePrice: 1 };
          break;
        case "priceHighToLow":
          sortCriteria = { salePrice: -1 };
          break;
        case "averageRatings":
          sortCriteria = { averageRating: -1 };
          break;
        case "featured":
          sortCriteria = { isFeatured: -1 };
          break;
        case "newArrivals":
          sortCriteria = { createdAt: -1 };
          break;
        case "aToZ":
          sortCriteria = { productName: 1 };
          break;
        case "zToA":
          sortCriteria = { productName: -1 };
          break;
        default:
          sortCriteria = {};
      }
  
      const products = await Product.find(searchCondition)
        .populate("category")
        .sort(sortCriteria)
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(); 
        
        const productIds = products.map(product => product._id);
        // const averageRatings = await calculateAverageRatings(productIds);
    
      
        // const productsWithRatings = products.map(product => ({
        //   ...product,
        //   averageRating: averageRatings[product._id.toString()]?.averageRating || 0,
        //   totalRatings: averageRatings[product._id.toString()]?.totalRatings || 0
        // }));
  
  
  
      const totalProducts = await Product.countDocuments(searchCondition);
      const totalPages = Math.ceil(totalProducts / limit);
  
    //   let userId = req.user || req.session.user;
    //   let userData = userId
    //     ? await User.findById(userId).populate("cart").exec()
    //     : null;
    //   if (userData && userData.cart && !userData.cart.items) {
    //     userData.cart.items = [];
    //   }
    //   res.locals.user = userData;
    const user = req.session.user;
    const userData = await User.findById(user)
  
      const categories = await Category.find({ isListed: true }).exec();
  
    //   const offer = await Offer.find()
    //     .populate("category")
    //     .populate("product")
    //     .exec();
  
        // const bannerImage = await Image.findOne({
        //   imageType: 'banner',
        //   page: 'shop',
        //   altText: 'inner'
        // });
  
  
      return res.render("user/products", {
        user: userData,
        products, 
        categories: categories,
        sortBy: sortBy || "",
        currentPage: page,
        totalPages: totalPages,
        totalProducts: totalProducts,
       
        selectedCategory: category || "",
        searchQuery,

      });
    } catch (error) {
      console.log("shop page not found:", error);
      next(error);
    }
  };

const loadProductDetails = async (req,res,next)=>{
    try {
       const {productId , categoryId}= req.query;

        // Validate the product ID
        if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
            return res.status(400).send('Invalid Product ID.');
        }

// Fetch the product from the database
const product = await Product.findById(productId).populate('category'); 

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
       next(error)
    }
}






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
}