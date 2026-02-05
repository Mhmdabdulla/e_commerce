
const mongoose = require("mongoose");
const {Schema} = mongoose;


const addressSchema = new Schema({
    user: {
        type:Schema.Types.ObjectId,
        ref:"User",
        required : true
    },
    
        name:{
            type : String,
            required : true,
        },
        city:{
            type: String,
            required :true,
        },
        landMark:{
            type: String,
            required :true
        },
        state:{
            type:String,
            required:true
        },
        pincode: {
            type : Number,
            required:true,
        },
        phone:{
            type : String,
            required :true,
        },
        altPhone:{
            type: String,
            required :false,
        },
        createdAt: {
            type: Date,
            default: Date.now
        }
   
})


const Address = mongoose.model("Address",addressSchema);


module.exports = Address;