const  calculateCartTotals =  (cart)=>{

        let subtotal = 0;
        let totalMRP = 0;
        let totalDiscount = 0;
        
    
        cart.items.forEach(item => {
            subtotal += item.totalPrice;
            totalMRP += item.quantity * item.regularPrice; // Add MRP for each item
    
            // Calculate discounts based on your business logic (e.g., 10% discount)
            const discount = item.quantity * (item.regularPrice - item.price); // Assuming `price` is discounted price
            totalDiscount += discount;
        });
        
         // Calculate shipping fee
         cart.shippingFee = subtotal > 300 ? 0 : 30;
        
         
    
        // cart.totalPrice = subtotal + cart.shippingFee; // Update total cart price
        cart.totalPrice = subtotal ;
        cart.totalMRP = totalMRP; // Update total MRP
        cart.totalDiscount = totalDiscount; // Update total discount
        cart.finalAmount = (cart.totalMRP - cart.totalDiscount) +cart.shippingFee; // Final amount after discount
    
    
}


module.exports = {
    calculateCartTotals,
}