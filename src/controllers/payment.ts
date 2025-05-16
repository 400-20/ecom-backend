import { stripe } from "../app.js";
import { TryCatch } from "../middlewares/error.js";
import { Coupon } from "../models/coupon.js";
import { Product } from "../models/product.js";
import { User } from "../models/user.js";
import { OrderItemType, ShippingInfoType } from "../types/types.js";
import ErrorHandler from "../utils/utility-class.js";

export const createPaymentIntent = TryCatch(async (req, res, next) => {
  const { id } = req.query;

  const user = await User.findById(id).select("name");

  if (!user) return next(new ErrorHandler("Please login first", 401));

  const {
    items,
    shippingInfo,
    coupon,
  }: {
    items: OrderItemType[];
    shippingInfo: ShippingInfoType | undefined;
    coupon: string | undefined;
  } = req.body;

  if (!items) return next(new ErrorHandler("Please send items", 400));

  if (!shippingInfo)
    return next(new ErrorHandler("Please send shipping info", 400));

  let discountAmount = 0;

  if (coupon) {
    const discount = await Coupon.findOne({ code: coupon });
    if (!discount) return next(new ErrorHandler("Invalid Coupon Code", 400));
    discountAmount = discount.amount;
  }

  const productIDs = items.map((item) => item.productId);

  const products = await Product.find({
    _id: { $in: productIDs },
  });

  const subtotal = products.reduce((prev, curr) => {
    const item = items.find((i) => i.productId === curr._id.toString());
    if (!item) return prev;
    return curr.price * item.quantity + prev;
  }, 0);

  const tax = subtotal * 0.18;

  const shipping = subtotal > 1000 ? 0 : 200;

  const total = Math.floor(subtotal + tax + shipping - discountAmount);

  const paymentIntent = await stripe.paymentIntents.create({
    amount: total * 100,
    currency: "inr",
    description: "MERN-Ecommerce",
    shipping: {
      name: user.name,
      address: {
        line1: shippingInfo.address,
        postal_code: shippingInfo.pinCode.toString(),
        city: shippingInfo.city,
        state: shippingInfo.state,
        country: shippingInfo.country,
      },
    },
  });

  return res.status(201).json({
    success: true,
    clientSecret: paymentIntent.client_secret,
  });
});

export const newCoupon = TryCatch(async (req, res, next) => {
    const { coupon, amount } = req.body
    if (!coupon || !amount) return next(new ErrorHandler("Please enter both coupon code and amount", 400))
    await Coupon.create({ code: coupon, amount })
    return res.status(201).json({
        success: true,
        message: `Coupon ${coupon} created successfully`,
    })
})

export const applyDiscount = TryCatch(async (req, res, next) => {
    const { coupon } = req.query
    const discount = await Coupon.findOne({ code: coupon })
    if (!discount) return next(new ErrorHandler("Invalid coupon code", 400))

    return res.status(200).json({
        success: true,
        discount: discount.amount
    })
})

export const allCoupons = TryCatch(async (req, res, next) => {
    const coupons = await Coupon.findOne({})
    return res.status(200).json({
        success: true,
        coupons
    })
})

export const deleteCoupon = TryCatch(async (req, res, next) => {
    const { id } = req.params
    const coupon = await Coupon.findByIdAndDelete(id)
    if (!coupon) return next(new ErrorHandler("Invalid coupon id", 400))
    return res.status(200).json({
        success: true,
        message: `Coupon ${coupon.code} deleted successfully`
    })
})