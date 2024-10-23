const Cart = require('../../models/cartSchema')
const Product = require('../../models/productSchema')


const listCart = async (req, res) => {
    const userId = req.session.user;

    try {
        const cart = await Cart.findOne({ userId }).populate('items.productId');
        
        

        return res.render('user/cart',{cart:cart});
    } catch (error) {
        return res.redirect('/pageNotFound')
    }
};


//shipping fee logic
const shipping = (cart)=>{
    // Calculate subtotal
    let subtotal = cart.items.reduce((acc, item) => acc + item.totalPrice, 0);

    // Calculate shipping fee
    let shippingFee = subtotal > 300 ? 0 : 30;

    // Set total price by adding the shipping fee
    let totalPrice = subtotal + shippingFee;

    // Update the cart with shipping fee and total price
    cart.shippingFee = shippingFee;
    cart.totalPrice = totalPrice;


}

// Add to Cart
const addToCart = async (req, res) => {
    const userId = req.session.user; 
    const {productId,quantity} = req.body;
    
    

    try {
        // Find product details
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        // Check if product is in stock
        if (product.stock === 0) {
            return res.status(400).json({ message: 'Product currently unavailable' });
        }

        // Find if cart already exists for this user
        let cart = await Cart.findOne({ userId });

        if (cart) {
            // Check if the product already exists in the cart
            const itemIndex = cart.items.findIndex(p => p.productId == productId);

            

            if (itemIndex > -1) {
                // Product exists, update quantity
                let productItem = cart.items[itemIndex];
                if (product.stock < productItem.quantity + quantity) {
                    return res.status(400).json({ message: 'Insufficient stock available' });
                }
                productItem.quantity += quantity;
                productItem.totalPrice = productItem.quantity * productItem.price;
                cart.items[itemIndex] = productItem;
            } else {
                // Product does not exist in cart, add it
                if (product.stock < quantity) {
                    return res.status(400).json({ message: 'Insufficient stock available' });
                }



                cart.items.push({
                    productId,
                    quantity,
                    price: product.salePrice,
                    totalPrice: product.salePrice * quantity
                });
            }
        } else {
            // No cart for user, create new cart
            if (product.stock < quantity) {
                return res.status(400).json({ message: 'Insufficient stock available' });
            }


            cart = new Cart({
                userId,
                items: [{
                    productId,
                    quantity,
                    price: product.salePrice,
                    totalPrice: product.salePrice * quantity
                }]
            });
        }
        shipping(cart)

        product.stock -= quantity;
        await product.save();

        // Decrease product stock
        await cart.save();
        return res.status(200).json({ message: 'Product added to cart successfully' });
    } catch (error) {
        console.error('error when adding to cart',error)
        return res.status(500).json({ message: 'Server error' });
    }
};

//updat cart quantity
const updateCartQuantity = async (req, res) => {
    const userId = req.session.user;
    const { productId, action } = req.body;

    try {
        const cart = await Cart.findOne({ userId });
        if (!cart) {
            return res.status(404).json({ message: 'Cart not found' });
        }

        const itemIndex = cart.items.findIndex(p => p.productId == productId);
        if (itemIndex === -1) {
            return res.status(404).json({ message: 'Product not found in cart' });
        }

        let productItem = cart.items[itemIndex];
        const product = await Product.findById(productId)
        
        if (action === 'increment') {
            // Check stock availability
            if (product.stock <= 0 || product.stock < productItem.quantity + 1) {
                return res.status(400).json({ message: 'No stock available' });
            }

            productItem.quantity += 1;
            product.stock -= 1;
        } else if (action === 'decrement') {
            // Ensure quantity doesn't go below 1
            if (productItem.quantity > 1) {
                productItem.quantity -= 1;
                product.stock += 1; // Increase product stock when quantity is decremented
            }
        }
        
        productItem.totalPrice = productItem.quantity * productItem.price;
        cart.items[itemIndex] = productItem;

        shipping(cart)
    
        await cart.save();
        await product.save();
        return res.status(200).json({ message: 'Cart updated successfully' });
    } catch (error) {
        console.log('error when updating cart quantity',error)
        return res.status(500).json({ message: 'Server error' });
    }
};

//remove product from cart
const removeFromCart = async (req, res) => {
    const userId = req.session.user;
    const { productId } = req.body;

    try {
        let cart = await Cart.findOne({ userId });
        if (!cart) {
            return res.status(404).json({ message: 'Cart not found' });
        }

        

        const itemIndex = cart.items.findIndex(p => p.productId == productId);
        if (itemIndex === -1) {
            return res.status(404).json({ message: 'Product not found in cart' });
        }
        let productItem = cart.items[itemIndex];

       

        // Increase product stock by removed quantity
        const product = await Product.findById(productId);
        product.stock += productItem.quantity;

        cart.items = cart.items.filter(item => item.productId != productId);
        


        shipping(cart)

        await product.save();
        await cart.save();

        return res.status(200).json({ message: 'Product removed from cart successfully' });
    } catch (error) {
        console.error(error)
        return res.status(500).json({ message: 'Server error' });
    }
};



module.exports = {
    listCart,
    addToCart,
    updateCartQuantity,
    removeFromCart

}