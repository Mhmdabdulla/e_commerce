const passport = require('passport')
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/userSchema');
const Wallet = require('../models/walletSchema');
const env = require('dotenv').config();


//cofigure the google strategy
passport.use(new GoogleStrategy({
    clientID : process.env.GOOGLE_CLIENT_ID,
    clientSecret : process.env.GOOGLE_CLIENT_SECRET,
    callbackURL : '/auth/google/callback'
},
async (accessToken,refreshToken,profile,done)=>{
    try {
        let user= await User.findOne({googleId : profile.id})
        if(user){
        
            return done(null,user)
        }else{
            //create the wallet for the user
            const newWallet = new Wallet({
                balance : 0
            })
            await newWallet.save();

            //generate unique referral code
            let referralCode;
            let isUnique = false;
            while(!isUnique){
                referralCode = Math.random().toString(36).substring(2,8).toUpperCase();
                const existingUser = await User.findOne({referralCode :referralCode});
                if(!existingUser){
                    isUnique = true;
                }
            }

            user = new User({
                name : profile.displayName,
                email : profile.emails[0].value,
                googleId : profile.id,
                wallet : newWallet._id,
                referralCode : referralCode,
            })
            await user.save();

            return done(null,user)
        }
        
    } catch (error) {
        return done(error,null)
        
    }
}
))

//assigning user details to session using serilization 
passport.serializeUser((user,done)=>{
    done(null,user.id)
})

//fecthing user data from session
passport.deserializeUser((id,done)=>{
  User.findById(id)
  .then((user)=>{
    return done(null,user)
  })
  .catch(err =>{
    return done(err,null)
  })
})

module.exports= passport;