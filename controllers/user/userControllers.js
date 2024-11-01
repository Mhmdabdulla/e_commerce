

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
           

        })
        productData.sort((a,b)=>new Date(b.createdOn)-new Date(a.createdOn))
        
        
        
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
const signUp = async (req,res)=>{
    
    try {
        
        const {name , email,phone , password ,cpassword} = req.body;
     
        if(password !== cpassword){
            return res.render('user/sign_up',{message : "Password do not match"})
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
        req.session.tempUser = {name,email,phone, password:hashedPassword}
        

        console.log('OTP send',otp)
        res.render('user/verify_otp')
        

        
    } catch (error) {
        console.error('sign up error',error)
        res.redirect('/pageNotFount')
    }
}


//Verify OTP
const verifyOtp = async function(req,res) {
    try {
        const {otp} = req.body;
        console.log('OTP from user',otp)
        if(otp === req.session.userOtp){
            const userDeatils = req.session.tempUser;
            const userData = new User(userDeatils);

            await userData.save();
            req.session.user = userData._id;

            delete req.session.tempUser;
            delete req.session.userOtp;

            res.json({success : true , redirectUrl : "/"})
            
            
        }else {
            res.status(400).json({success : false  , message : 'invalid OTP , please try again'})
        }
     } catch (error) {
  
        console.error('Error verifying OTP:', error);
        res.status(500).json({ success: false, message: 'Error occurred when verifying OTP' });
    }
}

//Resend OTP
const resendOtp =async(req,res)=>{
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
        res.status(500).json({ success: false, message: 'An error occurred while resending OTP' });
    }
}


//login function
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
        res.render('user/login',{message : 'Login failed, please try again later'})

        
    }
}

//logout
const logout = async(req,res)=>{
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
        res.redirect('/pageNotFound')
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

const loadProductDetails = async (req,res)=>{
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
       res.redirect('/pageNotFount') 
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