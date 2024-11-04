const Cart = require('../../models/cartSchema')
const Coupon = require('../../models/couponSchema')

exports.applyCoupon = async (req, res) => {
    try {
        const { couponCode } = req.body;
        const userId = req.session.user; // Assuming user ID is stored in session

        // Find the user's cart
        const cart = await Cart.findOne({ userId });
        if (!cart) {
            return res.status(404).json({ success: false, message: 'Cart not found' });
        }

        // Find the coupon by code
        const coupon = await Coupon.findOne({ code: couponCode, isActive: true });
        if (!coupon) {
            return res.status(400).json({ success: false, message: 'Invalid or inactive coupon' });
        }

        // Check if the cart meets the minimum price requirement for the coupon
        if (cart.totalPrice < coupon.minimumPrice) {
            return res.status(400).json({ success: false, message: `Minimum price of ${coupon.minimumPrice} required to apply this coupon.` });
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

        res.json({ success: true, message: 'Coupon applied successfully!', cart });
    } catch (error) {
        console.error("Error applying coupon: ", error);
        res.status(500).json({ success: false, message: 'An error occurred while applying the coupon.' });
    }
}

exports.removeCoupon = async (req, res) => {
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
      res.status(500).json({ success: false, message: "Internal server error." });
    }
  };