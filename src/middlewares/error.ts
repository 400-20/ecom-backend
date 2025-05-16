import express, { NextFunction, Request, Response } from 'express';
import ErrorHandler from '../utils/utility-class.js';
import { ControllerType } from '../types/types.js';


export const errorMiddleware:any=(error: ErrorHandler, req: Request, res: Response, next: NextFunction) => {

// error.message = error.message|| ""; short form 👇
    error.message ||= "Internal Server Error"
    error.statusCode ||= 500;

    if(error.name === "CastError") error.message = "Invalid ID"

    return res.status(error.statusCode).json({
        success: false,
        message: error.message,
    })
}

// a function that returns a function 
export const TryCatch = (func:ControllerType) => (req: Request, res: Response, next: NextFunction) => {
    return Promise.resolve(func(req, res, next)).catch((next));
}