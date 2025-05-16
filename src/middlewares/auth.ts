// middleware to make sure only admin is allowed 

import { User } from "../models/user.js";
import ErrorHandler from "../utils/utility-class.js";
import { TryCatch } from "./error.js";

export const adminOnly = TryCatch(async (req, res, next) => {
    const { id } = req.query; 
    if(!id) return next(new ErrorHandler("Please provide user id", 401));

    const user = await User.findById(id);
    if(!user) return next(new ErrorHandler("Please Provide a valid ID", 401));
    
    if(user.role!== "admin") return next(new ErrorHandler("Access denied, you are not an admin", 403));

    next();
})