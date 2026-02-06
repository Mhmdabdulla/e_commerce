const express = require('express')
const app = express()
const path = require('path')
const env = require('dotenv').config()
const db = require('./config/db')
const exp = require('constants')
const nocache = require('nocache')
const userRouter = require('./routes/userRouter')
const adminRouter = require('./routes/adminRouter')
const session = require('express-session')
const passport = require('./config/passport')
const User = require('./models/userSchema')
const {errorHandler} = require('./middlewares/error')
db()



//middle ware setting
app.use(express.json())
app.use(express.urlencoded({extended:true}))
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave : false,
    saveUninitialized : true,
    cookie : {
        secure : false,
        httpOnly : true,
        maxAge :72*60*60*1000
    }
}))

app.use((req,res,next)=>{
    res.set('cache-control','no store')
    next();
})
app.use(nocache())


app.set('view engine','ejs')
app.set('views',path.join(__dirname,'views'))
app.use(express.static(path.join(__dirname,'public/foody2-1.0.0')))

app.use(passport.initialize())
app.use(passport.session())


app.use('/',userRouter)
app.use('/admin',adminRouter)

app.use(errorHandler)

const PORT = process.env.PORT || 3000;

app.listen(PORT , ()=>{
    console.log(`Running on ${PORT}`)
})
 

module.exports = app;