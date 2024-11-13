const User = require('../../models/userSchema')
const mongoose = require('mongoose')
const bcrypt = require('bcrypt')


const loadLogin = async (req,res,next)=>{
    if(req.session.admin){
        return res.redirect('/admin')
    }
    res.render('admin/login',{message : null})
}

const login = async (req,res) => {
   try {
    const {email,password} = req.body;
    const admin = await User.findOne({email, isAdmin:true})
    if(admin){
        const passwordMatch = await bcrypt.compare(password,admin.password)
        if(passwordMatch){
            req.session.admin = true;
            return res.redirect('/admin')
        }else{
            return res.redirect('/login')
        }
    }else{
        return res.redirect('/login')
    }
    
   } catch (error) {
    console.log('admin login error',error)
    next(error)
    
   }
    

}

const loadDashboard = async (req,res,next)=>{
    try {
        if(req.session.admin){
            res.render('admin/dashboard')
        }else{
            redirect('/admin/login')
        }
    } catch (error) {
        res.redirect('/pageerror')
        
    }
}

const pageError = async function pageError(req,res) {
    res.render('admin/admin-error')
}

const logout = async (req,res)=>{
    try {
        req.session.destroy((err)=>{
            if(err){
                console.log('error destroying session',err)
            }else{
                res.redirect('/admin/login')
            }
        })
    } catch (error) {
        console.log('error when logouting by admin',error)
        next(error)
        
    }
}

module.exports = {
    loadLogin,
    login,
    loadDashboard,
    pageError,
    logout
}

