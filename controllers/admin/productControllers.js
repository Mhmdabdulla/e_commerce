const Product = require('../../models/productSchema')
const Category = require('../../models/categorySchema')
const Brand = require('../../models/brandSchema')
const User = require('../../models/userSchema')
const fs = require('fs')
const path = require('path')
const sharp = require('sharp')


const getProductAddPage = async (req,res,next)=>{
    try {
        const category = await Category.find({isListed:true})
        const brand = await Brand.find({isBlocked:false})
        res.render('admin/product-add',{cat:category,brand:brand})
    } catch (error) {
        
        console.log('error when getproduct page',error)
        next(error)
    }
}

const addProducts = async (req,res,next)=>{
    try {
        const products = req.body;
        const productExist = await Product.findOne({
            productName : products.productName
        });
        if(!productExist){
            const images = []
            if(req.files && req.files.length >0){
                for(let i=0;i<req.files.length;i++){
                    const originalImagePath = req.files[i].path;
                    const resizedImagePath = path.join('public/foody2-1.0.0','uploads','product-images', req.files[i].filename)
                    try {
                        await sharp(originalImagePath).resize({width:440,height:440}).toFile(resizedImagePath);
                    } catch (error) {
                        console.log('sharp error',error)
                    }
                    images.push(req.files[i].filename); 
                }
            }
            const category = await Category.findOne({_id:products.category})

            if(!category){
                return res.status(400).json('invalid category name')
            }

             // Check the category offer
             const categoryOffer = category.categoryOffer; // Assuming this is a percentage

             let salePrice;
             let productOffer;
             if (categoryOffer > 0) {
                 // Calculate the sale price based on the category offer
                 productOffer = categoryOffer;
                 salePrice = products.regularPrice - (products.regularPrice * (productOffer / 100));

             } else {
                 // No offer, set sale price as regular price
                 productOffer = 0;
                 salePrice = products.regularPrice;
             }



            const newProduct = new Product({
                productName : products.productName,
                description : products.description,
                category : category._id,
                regularPrice : products.regularPrice,
                salePrice : salePrice,
                createdOn : new Date(),
                stock : products.quantity,
                productImage : images,
                productOffer : productOffer,
                status : 'Available'

            })

            await newProduct.save();
            return res.redirect('/admin/addProducts')
        }else{
            return res.status(400).json('product alredy exist, please try with another name')
        }
    } catch (error) {
        console.log('error when adding products', error)
        next(error)
    }
}

const getAllProducts = async (req,res,next)=>{
    try {
        const search = req.query.search || '';
        const page = req.query.page || 1;
        const limit = 4;
        const productData = await Product.find({
            $or:[
                {productName : {$regex:new RegExp(".*"+search+".*","i")}},
                // {brand : {$regex:new RegExp(".*"+search+".*","i")}}

            ]
        })
        .limit(limit*1)
        .skip((page-1)*limit)
        .populate('category','name')
        .exec();
        

        const count = await Product.find({
            $or:[
                {productName : {$regex:new RegExp(".*"+search+".*","i")}},
                // {brand : {$regex:new RegExp(".*"+search+".*","i")}}

            ]
        }).countDocuments();

        const category = await Category.find({isListed:true})
        // const brand = await Brand.find({isBlocked:false})
        if(category){
            res.render('admin/products',{
                data : productData,
                currentPage : page,
                totalPages : Math.ceil(count/limit),
                cat : category,
                //brand : brand
            })
        }else{
            res.render('admin/404-error')
        }
    } catch (error) {
        console.log('Error in getAllProducts',error)
        next(error)
    }
}

const addProductOffer = async (req,res,next)=>{
    try {
        const {productId,percentage} = req.body;

        const findProduct = await Product.findOne({_id:productId})
        // const findCategory = await Category.findOne({_id:findProduct.category})

        // if(findCategory.categoryOffer > percentage){
        //     return res.json({status:false,message:'this product already have a category offer'})

        // }
        findProduct.salePrice = findProduct.regularPrice - Math.floor(findProduct.regularPrice*(percentage/100));
        findProduct.productOffer = parseInt(percentage)
        await findProduct.save();
        // findCategory.categoryOffer = 0;
        // await findCategory.save();
        res.json({status:true})
    } catch (error) {
        console.log('error in server when addproduct offer',error)
        next(error)
    }
}

const removeProductOffer = async (req,res,next)=>{
    try {
        const {productId} = req.body
        const findProduct = await Product.findOne({_id:productId})
        const percentage = findProduct.productOffer;
        // findProduct.salePrice = findProduct.salePrice + Math.floor(findProduct.regularPrice*(percentage/100));
        findProduct.salePrice = findProduct.regularPrice
        findProduct.productOffer = 0;
        await findProduct.save();
        res.json({status:true})
    } catch (error) {
        console.log('internal error when removing product offer',error)
        next(error)
    }
}


const blockProduct= async (req,res,next)=>{
    try {
        const id = req.query.id;
        await Product.updateOne({_id:id},{$set:{isBlocked:true}})
        res.redirect('/admin/products')

    } catch (error) {
        console.log('error when blocking',error)
       next(error)
    }
}

const unblockProduct = async (req,res,next)=>{
    try {
        const id = req.query.id;
        await Product.updateOne({_id:id},{$set:{isBlocked:false}})
        res.redirect('/admin/products')

    } catch (error) {
        console.log('error when unblocking',error)
        next(error)
    }
}

const getEditProduct = async (req,res,next)=>{
    try {
        const id = req.query.id
        const product = await Product.findOne({_id:id})
        const category = await Category.find()
        // const brand = await Brand.find()
        res.render('admin/edit-product',{
            product : product,
            cat : category,
            // brand : brand
        })
    } catch (error) {
        console.log('error when loading product editing page',error)
        next(error)
    }
}

const editProduct = async (req,res,next)=>{
    try {
        const id = req.params.id;
        const product = await Product.findOne({_id:id})
        const data = req.body;

        
        const existingProduct = await Product.findOne({
            productName : data.productName,
            _id : {$ne:id}
        })

        if(existingProduct){
            return res.status(400).json('Product with this name already exist, please try another name');
        }

        const images = [];
        if(req.files && req.files.length > 0){
            for(let i=0;i<req.files.length;i++){
                images.push(req.files[i].filename)
            }
        }

        const category = await Category.findOne({_id:data.category})
        

        if(!category){
            return res.status(400).json('invalid category name')
        }

         // Check the category offer
         const categoryOffer = category.categoryOffer; 
         let  productOffer = product.productOffer;

         let salePrice;
         if (categoryOffer > 0 && productOffer > 0) {
            if(categoryOffer > productOffer){
                productOffer = categoryOffer
            }
             // Calculate the sale price based on the category offer
             salePrice = data.regularPrice - (data.regularPrice * (productOffer / 100));
         } else if(categoryOffer >0 && productOffer == 0) {
            productOffer = categoryOffer;
             // No offer, set sale price as regular price
             salePrice = data.regularPrice - (data.regularPrice * (productOffer / 100));
         }else{
            salePrice = data.regularPrice;
         }

        const updateField = {
            productName : data.productName,
            description : data.descriptionData,
            // brand : data.brand,
            category : data.category,
            regularPrice : data.regularPrice,
            salePrice : salePrice,
            stock : data.quantity,
            productOffer : productOffer
    

        }
        console.log(updateField.description,updateField.quantity)
        if(req.files.length>0){
            updateField.$push = {productImage:{$each:images}}
        }
        await Product.findByIdAndUpdate(id,updateField,{new:true})
        res.redirect('/admin/products');
    } catch (error) {
        console.error('error when editing product',error)
        next(error)
    }
}

const deleteSingleImage = async (req,res,next)=>{
    try {
        const {imageNameToServer,productIdToServer} = req.body;
        await Product.findByIdAndUpdate(productIdToServer,{$pull:{productImage:imageNameToServer}})
        const imagePath = path.join('public/foody2-1.0.0','uploads','re-images',imageNameToServer)

        if(fs.existsSync(imagePath)){
            await fs.unlinkSync(imagePath)
            console.log(`Image ${imageNameToServer} deleted successfully`)
        }else{
            console.log(`Image ${imageNameToServer} not found`)
        }

    } catch (error) {
        console.error('error when deleting image',error)
        next(error)
    }
}

module.exports = {
    getProductAddPage,
    addProducts,
    getAllProducts,
    addProductOffer,
    removeProductOffer,
    blockProduct,
    unblockProduct,
    getEditProduct,
    editProduct,
    deleteSingleImage
}
