const User = require('../../models/userSchema')

const customerInfo = async (req,res,next)=>{
    try {
        let search = '';
        if(req.query.search){
            search = req.query.search
        }
        let page = 1;
        if(req.query.page){
            page = req.query.page
        }
        const limit = 3;
        const userData = await User.find({
            isAdmin : false,
            $or:[
                {name : {$regex:".*"+search+".*"}},
                {email : {$regex:".*"+search+".*"}}
            ]
        })
        .limit(limit*1)
        .skip((page-1)*limit)
        .exec;

        const count =await User.find({
            isAdmin : false,
            $or:[
                {name : {$regex:".*"+search+".*"}},
                {email : {$regex:".*"+search+".*"}}
            ]
        }).countDocuments()

        res.render('admin/customers',{
            data: await User.find({isAdmin :false}), // pass userData as 'data'
            totalPages: Math.ceil(count / limit), // total pages for pagination
            currentPage: page // current page number
        })
        
    } catch (error) {
        console.log('error in customerInfo',error)
        next(error)
    }
}

const customerBlocked = async (req,res,next)=>{
try {
    let id = req.query.id
    await User.updateOne({_id:id},{$set:{isBlocked : true}})
    res.redirect('/admin/users')
    
} catch (error) {
    console.log('Error in customerBlocked',error)
    next(error)
}
}

const customerunBlocked = async (req,res,next)=>{
    try {
        let id = req.query.id
        await User.updateOne({_id:id},{$set:{isBlocked : false}})
        res.redirect('/admin/users')
        
    } catch (error) {
        console.log('Error in customerunBlocked',error)
        next(error)
    }
    }
    


module.exports = {
    customerInfo,
    customerBlocked,
    customerunBlocked
}