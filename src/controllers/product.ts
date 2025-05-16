import { NextFunction, Request, Response } from "express";
import { TryCatch } from "../middlewares/error.js";
import { BaseQueryType, NewProductRequestBody, SearchRequestQuery } from "../types/types.js";
import { Product } from "../models/product.js";
import ErrorHandler from "../utils/utility-class.js";
import { rm } from 'fs'
import { myCache } from "../app.js";
import { invalidatesCache } from "../utils/features.js";
// revalidate on new, update, delete product and on new order

export const newProduct = TryCatch(async (
    req: Request<{}, {}, NewProductRequestBody>,
    res: Response,
    next: NextFunction
) => {

    const { name, price, stock, category } = req.body;

    const photo = req.file;

    if (!photo) return next(new ErrorHandler("Please add photo", 400));
    if (!name || !price || !stock || !category) {
        rm(photo.path, () => {
            console.log("Deleted");
        })

        return next(new ErrorHandler("Please enter all feild", 400));
    }

    await Product.create({
        name, price, stock,
        category: category.toLowerCase(),
        photo: photo.path,
    })

    invalidatesCache({ product: true, admin: true });

    return res.status(201).json({
        success: true,
        message: "Product created successfully"
    })
})

export const getLatestProducts = TryCatch(async (req, res, next) => {
    let products = [];
    if (myCache.has("latest-products")) { products = JSON.parse(myCache.get("latest-products") as string) }
    else {
        products = await Product.find({}).sort({ createdAt: "descending" }).limit(5);
        myCache.set("latest-products", JSON.stringify(products));
    }

    return res.status(200).json({
        success: true,
        products
    })
})

export const getAllCategories = TryCatch(async (req, res, next) => {
    let categories;
    if (myCache.has("categories")) categories = JSON.parse(myCache.get("categories") as string)
    else {
        categories = await Product.distinct("category");
        myCache.set("categories", JSON.stringify(categories))
    }

    return res.status(200).json({
        success: true,
        categories
    })
})

export const getAdminProducts = TryCatch(async (req, res, next) => {
    let products;
    if (myCache.has("all-products")) products = JSON.parse(myCache.get("all-products") as string)
    else {
        products = await Product.find({})
        myCache.set("all-products", JSON.stringify(products))
    }
    return res.status(200).json({
        success: true,
        products
    })
})

export const getSingleProduct = TryCatch(async (req, res, next) => {
    const id = req.params.id;
    let product;
    if (myCache.has(`product-${id}`)) {
        product = JSON.parse(myCache.get(`product-${id}`) as string)
    }
    else {
        product = await Product.findById(id)
        if (!product) return next(new ErrorHandler("product not found", 404));
        myCache.set(`product-${id}`, JSON.stringify(product))
    }
    return res.status(200).json({
        success: true,
        product
    })
})

export const UpdateProduct = TryCatch(async (req, res, next) => {
    const { id } = req.params
    const { name, price, stock, category } = req.body;
    const photo = req.file;
    const product = await Product.findById(id)

    if (!product) return next(new ErrorHandler("Invalid Id", 404));

    if (photo) {
        rm(product.photo, () => { console.log("old photo Deleted") })
        product.photo = photo.path
    }
    if (name) product.name = name;
    if (price) product.price = price;
    if (stock) product.stock = stock;
    if (category) product.category = category;

    await product.save()

    invalidatesCache({ product: true, admin: true, productId: String(product._id) });

    return res.status(200).json({
        success: true,
        message: "Product updated successfully"
    })
})

export const deleteProduct = TryCatch(async (req, res, next) => {
    const product = await Product.findById(req.params.id)
    if (!product) return next(new ErrorHandler("product not found", 404));

    rm(product.photo!, () => { console.log("old photo Deleted") })

    await product.deleteOne();
    invalidatesCache({ product: true, admin: true, productId: String(product._id) });
    return res.status(200).json({
        success: true,
        message: "Product deleted successfully"
    })
})

export const getAllProducts = TryCatch(async (req: Request<{}, {}, {}, SearchRequestQuery>, res, next) => {
    const { category, price, search, sort } = req.query
    const page = Number(req.query.page) || 1;
    const limit = Number(process.env.PRODUCT_PER_PAGE) || 8;
    const skip = (page - 1) * limit;

    // regex means match all products matching the name not specific    "i" means case insensitive     lte means less than equal to     match exact category
    const baseQuery: BaseQueryType = {}

    if (search) baseQuery.name = {
        $regex: search,
        $options: "i"
    }
    if (price) baseQuery.price = {
        $lte: Number(price)
    }
    if (category) baseQuery.category = category

    const [products, filteredOnlyProducts] = await Promise.all([
        Product.find(baseQuery).sort(
            sort && { price: sort === "asc" ? 1 : -1 }
        ).limit(limit).skip(skip),

        Product.find(baseQuery)
    ])

    const totalPage = Math.ceil(filteredOnlyProducts.length / limit)

    return res.status(200).json({
        success: true,
        products,
        totalPage
    })
})

