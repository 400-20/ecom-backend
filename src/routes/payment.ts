import express, { RequestHandler } from 'express';
import { adminOnly } from '../middlewares/auth.js';
import { allCoupons, applyDiscount, createPaymentIntent, deleteCoupon, newCoupon } from '../controllers/payment.js';

const app = express.Router();

//  api is /api/v1/payment/create post req 
app.post("/create", createPaymentIntent as RequestHandler)
//  api is /api/v1/payment/coupon/new post req 
app.post("/coupon/new", adminOnly as RequestHandler, newCoupon as RequestHandler)
//  api is /api/v1/payment/discount post req 
app.get("/discount", applyDiscount as RequestHandler)
//  api is /api/v1/payment/coupon/all post req 
app.get("/coupon/all", adminOnly as RequestHandler, allCoupons as RequestHandler)
//  api is /api/v1/payment/coupon/id post req 
app.delete("/coupon/:id",adminOnly as RequestHandler, deleteCoupon as RequestHandler)


export default app;