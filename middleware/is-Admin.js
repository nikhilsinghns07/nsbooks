exports.isAdmin = (req,res,next) => {
    let email = req.body.email
    let isAdmin 
    if(email == 'nikhil_singhns@outlook.com'){
        isAdmin = true;
    }
    return isAdmin;
}