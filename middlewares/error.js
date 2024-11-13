function errorHandler(err, req, res, next) {
    const statusCode = err.statusCode || 500;
    if(req.session.admin){
        console.log(statusCode,err)
    res.status(statusCode).redirect('/admin/pageerror');
    }else{
        console.log(statusCode,err)
        res.status(statusCode).redirect('/user/pageNotFound')  
    }
    next()
}



module.exports ={
    errorHandler

}