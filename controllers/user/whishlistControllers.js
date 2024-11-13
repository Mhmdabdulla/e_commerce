// controllers/wishlistController.js
const Wishlist = require('../../models/whishlistSchema');
const Product = require('../../models/productSchema');
const User = require('../../models/userSchema')

exports.getWishlist = async (req, res,next) => {
    try {
        const userId = req.session.user;
        const wishlist = await Wishlist.findOne({ userId }).populate('products.productId');
        const userData = await User.findOne({_id:userId})
        res.render('user/whishlist', { wishlist ,user:userData});
    } catch (error) {
        console.error('Error fetching wishlist:', error);
        next(error)
    }
};

exports.addToWishlist = async (req, res) => {
    const { productId } = req.body;
    const userId = req.session.user
    try {
        let wishlist = await Wishlist.findOne({ userId });
        
        if (!wishlist) {
            wishlist = new Wishlist({ userId , products: [{ productId }] });
        } else if (!wishlist.products.some(item => item.productId.toString() === productId)) {
            wishlist.products.push({ productId });
        } else {
            return res.json({ message: 'Product already in wishlist' });
        }
        
        await wishlist.save();
        res.json({ message: 'Product added to wishlist successfully' });
    } catch (error) {
        console.error('Error adding to wishlist:', error);
    
    }
};

exports.removeFromWishlist = async (req, res) => {
    const productId = req.query.productId;
    const userId = req.session.user;

    Wishlist.updateOne(
        { userId },
        { $pull: { products: { productId } } }
    )
    .then(() => {
        res.json({ message: 'Product removed from wishlist' });
    })
    .catch(error => {
        console.error('Error removing product from wishlist:', error);
       
    });
};
