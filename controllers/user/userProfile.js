const User = require('../../models/userSchema')
const Address = require('../../models/addressSchema')
const bcrypt = require('bcrypt')



const loadProfile = async (req,res,next)=>{
    try {
        const userId = req.session.user
        const userData = await User.findOne({_id:userId})

        res.render('user/user-profile',{user:userData})
    } catch (error) {
        console.log('error loading profile :' ,  error)
        next(error)
    }
}

const loadAddress = async (req,res,next) =>{
    try {
        const userId = req.session.user
        const userData = await User.findOne({_id:userId})
        const addresses = await Address.find({user:userId})

        res.render('user/address',{user:userData,addresses})
        
    } catch (error) {
        console.log('error loading address : ',error)
        next(error)
    }
}

const getSingleAddress = async (req,res,next) => {
    try {
        const userId = req.session.user
        const address = await Address.findOne({_id:req.params.id,user:userId})

        if (!address) {
            return res.status(404).json({ error: 'Address not found' });
        }
        res.json(address);
        
    } catch (error) {
        console.error(error)
        next(error)
    }
}

const addAddress = async (req,res,next)=>{
    const { name, city, landMark, state, pincode, phone, altPhone } = req.body;
    try {
        const userId = req.session.user
        const newAddress = new Address({
            user: userId,
            name,
            city,
            landMark,
            state,
            pincode,
            phone,
            altPhone
        });
        await newAddress.save();
        if(req.query.from == 'address'){
        res.redirect('/address');
        }else{
            res.redirect('/checkout')
        }
    } catch (error) {
        console.error(error)
        next(error)
    }
}

const editAddress = async (req,res,next) => {
    const { name, city, landMark, state, pincode, phone, altPhone } = req.body;
    try {
        const userId = req.session.user
        await Address.findOneAndUpdate(
            { _id: req.params.id, user: userId },
            { name, city, landMark, state, pincode, phone, altPhone }
        );

        
        if(req.query.from == 'address'){
            res.redirect('/address');
            }else{
                res.redirect('/checkout')
            }
    } catch (error) {
        console.error(error)
        next(error)
    }
}

const deleteAddress = async (req,res,next) => {
    try {
        const userId = req.session.user
        await Address.findOneAndDelete({ _id: req.params.id, user: userId });
        res.redirect('/address');
    } catch (error) {
        console.error('Error in deleteAddress',error)
        next(error)
    }
}

const updateProfile = async (req,res,next) => {
    try {
        const userId = req.session.user
        const { name,  phone } = req.body;

                // Validate inputs
                if (!name  || !phone) {
                    console.log('no credentila')
                    return res.redirect('/profile');
                }

                        // Update user information
        await User.findByIdAndUpdate(userId, { name,  phone });

        
        res.redirect('/profile');

    } catch (error) {
        console.error('Error in updateProfile',error);
        next(error)
    }
}

const changePassword = async (req,res,next) => {
    try {
        const { currentPassword, newPassword, confirmPassword } = req.body;
        const userId = req.session.user;

                // Validate inputs
                if (!currentPassword || !newPassword || !confirmPassword) {
                    return res.status(400).send('All fields are required.');
                }

        
                // Find user
                const user = await User.findById(userId);
                if (!user) {
                   return res.status(404).send('User  not found.');
                }
        
                // Check current password
                const isMatch = await bcrypt.compare(currentPassword, user.password);
                if (!isMatch) { 
                    return res.status(401).send('Current password is incorrect.');
                }
        
                // Hash new password
                const hashedPassword = await bcrypt.hash(newPassword, 10);
        
                // Update password
                user.password = hashedPassword;
                await user.save();
        
             
                res.status(200).send('Password changed successfully.');
        
    } catch (error) {
        console.error('Error in changePassword',error);
        next(error)
    }
}

module.exports = {
    loadProfile,
    loadAddress,
    getSingleAddress,
    addAddress,
    editAddress,
    deleteAddress,
    updateProfile,
    changePassword

}