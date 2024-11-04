// controllers/couponController.js
const Coupon = require('../../models/couponSchema');


exports.getCoupon = async (req,res) => {
    try {
        const coupons = await Coupon.find()

        res.render('admin/coupon',{coupons})
    } catch (error) {
        console.log('Error coupon loading' , error)
    }
}

// Create a new coupon
exports.createCoupon = async (req, res) => {
    try {
        const { code, discountAmount, discountType, expiryDate, minimumPrice } = req.body;
        const newCoupon = new Coupon({ code, discountAmount, discountType, expiryDate, minimumPrice });
        await newCoupon.save();
        res.status(201).json({ message: 'Coupon created successfully', coupon: newCoupon });
    } catch (error) {
        res.status(500).json({ message: 'Error creating coupon', error: error.message });
    }
};

// Update an existing coupon
exports.updateCoupon = async (req, res) => {
    try {
        const { couponId } = req.params;
        const updateData = req.body;
        const updatedCoupon = await Coupon.findByIdAndUpdate(couponId, updateData, { new: true });
        res.status(200).json({ message: 'Coupon updated successfully', coupon: updatedCoupon });
    } catch (error) {
        res.status(500).json({ message: 'Error updating coupon', error: error.message });
    }
};

// Delete a coupon
exports.deleteCoupon = async (req, res) => {
    try {
        const { couponId } = req.params;
        await Coupon.findByIdAndDelete(couponId);
        res.status(200).json({ message: 'Coupon deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting coupon', error: error.message });
    }
};
