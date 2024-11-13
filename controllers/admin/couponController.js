// controllers/couponController.js
const Coupon = require('../../models/couponSchema');


exports.getCoupon = async (req,res,next) => {
    try {
        const search = req.query.search || '';
        const page = req.query.page || 1;
        const limit = 4;

        const coupons = await Coupon.find({
            
                code : {$regex:new RegExp(".*"+search+".*","i")}
            
        })
        .limit(limit*1)
        .skip((page-1)*limit)
        .exec();

        const count = await Coupon.find({
            code : {$regex:new RegExp(".*"+search+".*","i")}
        }).countDocuments();

        res.render('admin/coupon',{
            coupons,
            currentPage : page,
            totalPages : Math.ceil(count/limit)
            
            
            })
    } catch (error) {
        console.log('Error coupon loading' , error)
        next(error)
    }
}

// Create a new coupon
exports.createCoupon = async (req, res,next) => {
    try {
        const { code, discountAmount, discountType, expiryDate, minimumPrice ,maximumPrice } = req.body;
        const newCoupon = new Coupon({ code, discountAmount, discountType, expiryDate, minimumPrice,maximumPrice });
        await newCoupon.save();
        res.status(201).json({ message: 'Coupon created successfully', coupon: newCoupon });
    } catch (error) {
        console.log('Error in createCoupon',error)
        next(error)
    }
};

// Update an existing coupon
exports.updateCoupon = async (req, res,next) => {
    try {
        const { couponId } = req.params;
        const updateData = req.body;
        const updatedCoupon = await Coupon.findByIdAndUpdate(couponId, updateData, { new: true });
        res.status(200).json({ message: 'Coupon updated successfully', coupon: updatedCoupon });
    } catch (error) {
        console.log('Error in updateCoupon',error)
        next(error)
    }
};

// Delete a coupon
exports.deleteCoupon = async (req, res,next) => {
    try {
        const { couponId } = req.params;
        await Coupon.findByIdAndDelete(couponId);
        res.status(200).json({ message: 'Coupon deleted successfully' });
    } catch (error) {
        console.log('Error in deleteCoupon',error)
        next(error)
    }
};
