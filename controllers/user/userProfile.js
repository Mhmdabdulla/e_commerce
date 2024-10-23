const User = require('../../models/userSchema')
const Address = require('../../models/addressSchema')
const bcrypt = require('bcrypt')



const loadProfile = async (req,res)=>{
    try {
        const userId = req.session.user
        const userData = await User.findOne({_id:userId})

        res.render('user/user-profile',{user:userData})
    } catch (error) {
        console.log('error loading profile :' ,  error)
    }
}

const loadAddress = async (req,res) =>{
    try {
        const userId = req.session.user
        const userData = await User.findOne({_id:userId})
        const addresses = await Address.find({user:userId})

        res.render('user/address',{user:userData,addresses})
        
    } catch (error) {
        console.log('error loading address : ',error)
        res.redirect('/profile')
    }
}

const getSingleAddress = async (req,res) => {
    try {
        const userId = req.session.user
        const address = await Address.findOne({_id:req.params.id,user:userId})

        if (!address) {
            return res.status(404).json({ error: 'Address not found' });
        }
        res.json(address);
        
    } catch (error) {
        console.error(error)
        res.status(500).json({ error: 'Server error' });
    }
}

const addAddress = async (req,res)=>{
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
        res.redirect('/address');

    } catch (error) {
        console.error(error)
        res.redirect('/address')
    }
}

const editAddress = async (req,res) => {
    const { name, city, landMark, state, pincode, phone, altPhone } = req.body;
    try {
        const userId = req.session.user
        await Address.findOneAndUpdate(
            { _id: req.params.id, user: userId },
            { name, city, landMark, state, pincode, phone, altPhone }
        );
        res.redirect('/address');
    } catch (error) {
        console.error(error)
        res.redirect('/address')
    }
}

const deleteAddress = async (req,res) => {
    try {
        const userId = req.session.user
        await Address.findOneAndDelete({ _id: req.params.id, user: userId });
        res.redirect('/address');
    } catch (error) {
        console.error(error)
        res.redirect('/address')
    }
}

const updateProfile = async (req,res) => {
    try {
        const userId = req.session.user
        const { name, email, phone } = req.body;

                // Validate inputs
                if (!name || !email || !phone) {
                    req.flash('error', 'All fields are required.');
                    return res.redirect('/profile');
                }

                        // Update user information
        await User.findByIdAndUpdate(userId, { name, email, phone });

        req.flash('success', 'Profile updated successfully.');
        res.redirect('/profile');

    } catch (error) {
        console.error(error);
        req.flash('error', 'An error occurred while updating your profile.');
        res.redirect('/profile');
    }
}

const changePassword = async (req,res) => {
    try {
        const { currentPassword, newPassword, confirmPassword } = req.body;
        const userId = req.session.user;

                // Validate inputs
                if (!currentPassword || !newPassword || !confirmPassword) {
                    req.flash('error', 'All fields are required.');
                    return res.redirect('/profile');
                }

                if (newPassword !== confirmPassword) {
                    req.flash('error', 'New passwords do not match.');
                    return res.redirect('/profile');
                }
        
                // Find user
                const user = await User.findById(userId);
                if (!user) {
                    req.flash('error', 'User not found.');
                    return res.redirect('/profile');
                }
        
                // Check current password
                const isMatch = await bcrypt.compare(currentPassword, user.password);
                if (!isMatch) {
                    req.flash('error', 'Current password is incorrect.');
                    return res.redirect('/profile');
                }
        
                // Hash new password
                const hashedPassword = await bcrypt.hash(newPassword, 10);
        
                // Update password
                user.password = hashedPassword;
                await user.save();
        
                req.flash('success', 'Password changed successfully.');
                res.redirect('/profile');
        
    } catch (error) {
        console.error(error);
        req.flash('error', 'An error occurred while changing your password.');
        res.redirect('/profile');
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