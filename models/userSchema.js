
const mongoose = require("mongoose");
const {Schema} = mongoose;


const userSchema = new Schema({
    name : {
        type:String,
        required : true
    },
    email: {
        type : String,
        required:true,
        unique: true
    },
    phone : {
        type : String,
        required: false,
        unique: true,
        sparse:true,
        default:null
    },
    googleId: {
        type: String,
        unique: true,
        sparse: true
    },
    password : {
        type:String,
        required :false
    },
    isBlocked: {
        type : Boolean,
        default:false
    },
    isAdmin : {
        type: Boolean,
        default:false
    },
    wallet: {
        type: Schema.Types.ObjectId,
        ref: "Wallet",
    },


    createdOn : {
        type:Date,
        default:Date.now,
    },
    referalCode:{
        type:String,
        unique : true
    },
    redeemed:{
        type:Boolean
    },
    redeemedUsers: [{
        type: Schema.Types.ObjectId,
        ref:"User"
    }],
    usedCoupons: [{ // field to track used coupons
        type: Schema.Types.ObjectId,
        ref: "Coupon"
    }]

})


const User = mongoose.model("User",userSchema);

module.exports = User;