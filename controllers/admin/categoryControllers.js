const Category = require('../../models/categorySchema')
const Product = require('../../models/productSchema');
const { findOne } = require('../../models/userSchema');

const categoryInfo =async (req,res,next)=>{
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 4;
        const skip = (page-1)*limit;

        const categoryData = await Category.find({})
        .sort({createdAt: -1})
        .skip(skip)
        .limit(limit)

        const totalCategories = await Category.countDocuments();
        const totalPages = Math.ceil(totalCategories / limit)

        res.render('admin/categories',{
            cat : categoryData,
            currentPage : page,
            totalCategories : totalCategories,
            totalPages : totalPages
        })
    } catch (error) {
        console.error(error)
        next(error)
    }
}

const addCategory = async (req,res,next)=>{
    const {name,description} = req.body;
    try {
        const existingCategory = await Category.findOne({name})
        if(existingCategory){
            return res.status(400).json({error:'category allready exist'})
        }
        const newCategory = new Category({
            name,
            description
        })
        await newCategory.save();
        return res.json({message:'category added successfully'})
    } catch (error) {
        return res.status(500).json({error:'internal sever error'})
        next(error)
    }
}

const addCategoryOffer = async (req,res,next)=>{
try {
    const {percentage,categoryId} = req.body;
    const category = await Category.findById(categoryId)
    if(!category){
        return res.status(404).json({status : false,message : 'Category not found'})
    }

    let products = await Product.find({category : category._id})
    // const hasProductOffer = products.some(product => product.productOffer > percentage)
    // if(hasProductOffer){
    //     products.forEach(product=>{

    //     })
        
        // return res.json({status : false, message: 'Products within this category already have product offer'})
    // }
    await Category.updateOne({_id:categoryId},{$set:{categoryOffer:percentage}})

    //set the product price and offer to default
    for(const product of products){
        if(product.productOffer < percentage){
            product.productOffer = percentage;
            

        }
        
        product.salePrice = product.regularPrice - (product.regularPrice * (product.productOffer / 100));;
        await product.save()
    }

    res.json({status:true})


    
} catch (error) {
    console.log('error when adding category offer', error)
    next(error)
}
}

const removeCategoryOffer = async (req,res,next)=>{
    try {
        const categoryId = req.body.categoryId
        const category = await Category.findById(categoryId)
        if(!category){
            return res.status(404).json({status:false,message: 'category not found'})
        }

        const percentage = category.categoryOffer;
        const products = await Product.find({category: category._id})
 //incrementing sale price by the offer price
// logic is the offer price which we can get by deviding offer in percentage by 100
//will added to sale price, so all product within that category will increase by sale price
        if(products.length > 0){
            for(const product of products){
               product.salePrice = product.regularPrice;
               product.productOffer = 0;
               await product.save();
            }
        }
        category.categoryOffer = 0;
        await category.save();
        res.json({status:true})
    } catch (error) {
        console.log('Error when removecategory offer',error)
        next(error)
    }
}

const getListCategory = async (req,res,next)=>{
    try {
        let id = req.query.id;
        await Category.updateOne({_id:id},{$set:{isListed:false}})
        res.redirect('/admin/category')
    } catch (error) {
        console.log('error getListCategory',error)
        next(error)
    }
}

const getUnlistCategory = async (req,res,next)=>{
    try {
        let id = req.query.id;
        await Category.updateOne({_id:id},{$set:{isListed:true}})
        res.redirect('/admin/category')
    } catch (error) {
        console.log('error getUnlistCategory',error)
        next(error)
    } 
}

const getEditCategory = async (req,res,next)=>{
    try {
        const id = req.query.id;
        const category = await Category.findOne({_id:id})
        res.render('admin/edit-category',{category:category})
    } catch (error) {
        
        console.log('error when loadin edit page',error)
        next(error)
    }
}

const editCategory = async (req,res,next)=>{
    try {
        const id = req.params.id;
        const {name,description} = req.body;
        console.log(req.body)
        
         // Check if the category already exists
        const hasExistCategory = await Category.findOne({name : name,description:description})
        if(hasExistCategory){
            
           return res.status(400).json({error:'category allready exist'})
        }

        // Update category
        const updateCategory = await Category.findByIdAndUpdate(id,{
            name : name,
            description : description
        },{new:true})

        if(updateCategory){
            return res.json({ message: 'Category updated successfully' }); // Return success message
        }else{
            res.status(404).json({error : 'category not found'})
        }

    } catch (error) {
        console.log(error)
        next(error)
        
    }
}

module.exports = {
    categoryInfo,
    addCategory,
    addCategoryOffer,
    removeCategoryOffer,
    getListCategory,
    getUnlistCategory,
    getEditCategory,
    editCategory

}