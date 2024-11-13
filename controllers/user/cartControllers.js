const Cart = require('../../models/cartSchema')
const Product = require('../../models/productSchema')
const User = require('../../models/userSchema')
const  {calculateCartTotals} = require('../../helpers/cart')


const listCart = async (req, res,next) => {
    const userId = req.session.user;
    const user = await User.findById(userId)
    try {
        const cart = await Cart.findOne({ userId }).populate('items.productId');
        
        return res.render('user/cart',{
            cart:cart,
            user,
            
        });
    } catch (error) {
        console.log('Cart error:',error)
        next(error)
    }
};


// Add to Cart
const addToCart = async (req, res,next) => {
    const userId = req.session.user; 
    const { productId, quantity } = req.body; 



    try {

        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({success:false, message: 'Product not found' });
        }

        if (product.stock === 0) {
            return res.status(400).json({success:false, message: 'Product currently unavailable' });
        }

        let cart = await Cart.findOne({ userId });

        if (cart) {
            const itemIndex = cart.items.findIndex(p => p.productId == productId);

            if (itemIndex > -1) {
                let productItem = cart.items[itemIndex];
                if (product.stock <  quantity) {
                    return res.status(400).json({success:false, message: 'Insufficient stock available' });
                }
                productItem.quantity += quantity;
                productItem.totalPrice = productItem.quantity * productItem.price;
                cart.items[itemIndex] = productItem;
            } else {
                if (product.stock < quantity) {
                    return res.status(400).json({ success:false,message: 'Insufficient stock available' });
                }

                cart.items.push({
                    productId,
                    quantity,
                    price: product.salePrice,
                    regularPrice: product.regularPrice, // MRP for the new item
                    totalPrice: product.salePrice * quantity
                });
            }
        } else {
            if (product.stock < quantity) {
                return res.status(400).json({success:false, message: 'Insufficient stock available' });
            }

            cart = new Cart({
                userId,
                items: [{
                    productId,
                    quantity,
                    price: product.salePrice,
                    regularPrice: product.regularPrice, // MRP for the new item
                    totalPrice: product.salePrice * quantity
                }],

                totalPrice: 0,
                totalMRP: 0, // Initialize to 0
                totalDiscount: 0, // Initialize to 0
                finalAmount: 0 // Initialize to 0
            });
        }

        // Update stock
        product.stock -= quantity;
        await product.save();


        // Calculate total amounts
        calculateCartTotals(cart);

        await cart.save();
        
        return res.status(200).json({success:true, message: 'Product added to cart successfully' });
    } catch (error) {
        console.error('Error when adding to cart:', error);
        next(error)
    }
};

//cart item number on icon 
const cartItemCount = async (req,res,next) =>{
    try {
        const userId = req.session.user; 
        const cart = await Cart.findOne({ userId });

        const cartItemCount = cart ? cart.items.length : 0;
        res.json({ cartItemCount });
    } catch (error) {
        console.error('Error fetching cart item count:', error);
        next(error)
    }
}

//updat cart quantity
const updateCartQuantity = async (req, res,next) => {
    const userId = req.session.user;
    const { productId, action } = req.body;

    try {
        const cart = await Cart.findOne({ userId });
        if (!cart) {
            return res.status(404).json({success:false, message: 'Cart not found' });
        }

        const itemIndex = cart.items.findIndex(p => p.productId == productId);
        if (itemIndex === -1) {
            return res.status(404).json({success:false, message: 'Product not found in cart' });
        }

        let productItem = cart.items[itemIndex];
        const product = await Product.findById(productId);
        
        if (action === 'increment') {
            if (product.stock <= 0 || product.stock < 1) {
                return res.status(400).json({success:false, message: 'No stock available' });
            }

            productItem.quantity += 1;
            product.stock -= 1;
        } else if (action === 'decrement') {
            if (productItem.quantity > 1) {
                productItem.quantity -= 1;
                product.stock += 1; 
            }
        }
        
        productItem.totalPrice = productItem.quantity * productItem.price;
        cart.items[itemIndex] = productItem;

        // Recalculate totals
        calculateCartTotals(cart);

        await cart.save();
        await product.save();
        return res.status(200).json({success:true, message: 'Cart updated successfully',newTotalPrice: productItem.totalPrice });
    } catch (error) {
        console.log('Error when updating cart quantity', error);
        next(error)
    }
};


//remove product from cart
const removeFromCart = async (req, res,next) => {
    const userId = req.session.user;
    const { productId } = req.body;

    try {
        let cart = await Cart.findOne({ userId });
        if (!cart) {
            return res.status(404).json({success:false, message: 'Cart not found' });
        }

        const itemIndex = cart.items.findIndex(p => p.productId == productId);
        if (itemIndex === -1) {
            return res.status(404).json({success:false, message: 'Product not found in cart' });
        }

        let productItem = cart.items[itemIndex];
        const product = await Product.findById(productId);
        
        // Increase product stock by the removed quantity
        product.stock += productItem.quantity;

        // Remove the product from the cart
        cart.items = cart.items.filter(item => item.productId != productId);

        // Recalculate totals
        calculateCartTotals(cart);

        await product.save();
        await cart.save();

        return res.status(200).json({success:true, message: 'Product removed from cart successfully', cart });
    } catch (error) {
        console.error('Error removing product from cart:', error);
        next(error)
    }
};



module.exports = {
    listCart,
    addToCart,
    updateCartQuantity,
    removeFromCart,
    cartItemCount

}