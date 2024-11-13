const Cart = require('../../models/cartSchema')
const Coupon = require('../../models/couponSchema')
const User = require('../../models/userSchema')

exports.applyCoupon = async (req, res,next) => {
    try {
        const { couponCode } = req.body;
        const userId = req.session.user; // Assuming user ID is stored in session

        // Find the user's cart
        const cart = await Cart.findOne({ userId });
        if (!cart) {
            return res.status(404).json({ success: false, message: 'Cart not found' });
        }
                // Find the user
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User  not found' });
        }

        // Find the coupon by code
        const coupon = await Coupon.findOne({ code: couponCode, isActive: true });
        if (!coupon) {
            return res.status(400).json({ success: false, message: 'Invalid or inactive coupon' });
        }

        // Check if the coupon has already been used by the user
        if (user.usedCoupons.includes(coupon._id)) {
            return res.status(400).json({ success: false, message: 'Coupon has already been used' });
        }


        // Check if the cart meets the minimum price requirement for the coupon
        if (cart.totalPrice < coupon.minimumPrice || cart.totalPrice > coupon.maximumPrice) {
            return res.status(400).json({ success: false, message: `This coupon only applicable between ${coupon.minimumPrice} and ${coupon.maximumPrice}.` });
        }

         // Check if the coupon is expired
         const currentDate = new Date();
         if (currentDate > coupon.expiryDate) {
             return res.status(400).json({ success: false, message: 'Coupon has expired' });
         }

        // Calculate the discount based on the coupon type
        let discount = 0;
        if (coupon.discountType === 'percentage') {
            discount = (cart.totalPrice * coupon.discountAmount) / 100;
        } else if (coupon.discountType === 'fixed') {
            discount = coupon.discountAmount;
        }

        // Update cart totals and store applied coupon details
        cart.appliedCoupon = {
            code: coupon.code,
            discountAmount: discount
        };

        // Update cart totals
        cart.totalDiscount += discount;
        cart.finalAmount = cart.totalMRP - cart.totalDiscount;

        // Save the updated cart
        await cart.save();

                // Mark the coupon as used by the user
                user.usedCoupons.push(coupon._id);
                await user.save();

        res.json({ success: true, message: 'Coupon applied successfully!', cart });
    } catch (error) {
        console.error("Error applying coupon: ", error);
        next(error)
    }
}

exports.removeCoupon = async (req, res,next) => {
    const userId = req.session.user;
    
    try {
      const cart = await Cart.findOne({ userId });
      if (!cart || !cart.appliedCoupon.code) {
        return res.status(400).json({ success: false, message: "No coupon applied to remove." });
      }

      const discountAmount = cart.appliedCoupon.discountAmount;
  
      // Remove coupon details and reset discount calculations
      cart.appliedCoupon = { code: null, discountAmount: 0 };
      cart.totalDiscount -= discountAmount;
      cart.finalAmount += discountAmount;
  
      await cart.save();
  
      res.json({ success: true, message: "Coupon removed successfully." });
    } catch (error) {
      console.error("Error removing coupon:", error);
      next(error)
    }
  };