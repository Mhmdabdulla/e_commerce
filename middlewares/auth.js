const User = require('../models/userSchema')


const userAuth =  (req,res,next)=>{

        if(req.session.user){
            User.findById(req.session.user)
            .then(data =>{
                if(data && !data.isBlocked){
                    next();
                }else{
                    res.redirect('/login')
                }
            })
            .catch(err =>{
                console.log('error in userauth middleware',err)
                res.status(500).send('internal server error')
            })
        }else{
            res.redirect('/login')
        }
   
        
    
}

const adminAuth = (req,res,next)=>{
    if(req.session.admin){
        User.findOne({isAdmin:true})
        .then(data =>{
            if(data){
                next()
            }else{
                res.redirect('admin/login')
            }
        })
        .catch(err => {
            console.log('internal error when admin auth middleware',err)
            res.status(500).send('server error ')
        })
    }else{
        res.redirect('/admin/login')
    }
}

module.exports = {
    userAuth,
    adminAuth
}