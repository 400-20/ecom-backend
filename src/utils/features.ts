import mongoose from "mongoose"
import { Document as MongooseDoc } from "mongoose";
import { InvalidateCacheProps, OrderItemType } from "../types/types.js"
import { myCache } from "../app.js"
import { Product } from "../models/product.js"

export const connectDB = (uri: string) => {
    mongoose.connect(uri, {
        dbName: "Ecommerce_25",
    }).then(c => console.log(`db connected to ${c.connection.host}`))
        .catch((e) => console.log(e))

}

export const invalidatesCache =  ({ product, order, admin, userId, orderId, productId }: InvalidateCacheProps) => {
    if (product) {
        const productKeys: any = ["latest-products", "categories", "all-products",]
        if (typeof productId === "string") productKeys.push(`product-${productId}`)
        if (typeof productId === "object") productId.forEach(id => productKeys.push(`product-${id}`))
        myCache.del(productKeys)
    }
    if (order) {
        const orderKeys: string[] = ["all-orders", `my-orders-${userId}`, `order-${orderId}`]
        myCache.del(orderKeys)
    }
    if (admin) {
        myCache.del(["admin-stats","admin-pie-charts","admin-bar-charts","admin-line-charts"])
    }
}

export const reduceStock = async (orderItems: OrderItemType[]) => {
    for (let i = 0; i < orderItems.length; i++) {
        const order = orderItems[i]
        console.log("Order Item Product ID:", order.productId);
        const product = await Product.findById(order.productId);
        if (!product) throw new Error("Product Not Found")
        product.stock -= order.quantity
        await product.save();
    }
}

export const calculatePercentage = (thisMonth: number, lastMonth: number) => {
    if (lastMonth === 0) return thisMonth * 100
    const percent = ((thisMonth) / lastMonth) * 100;
    return Number(percent.toFixed(0));
}

export const getInventories = async ({
    categories,
    productsCount,
}: {
    categories: string[];
    productsCount: number;
}) => {
    const categoriesCountPromise = categories.map((category) =>
        Product.countDocuments({ category })
    );

    const categoriesCount = await Promise.all(categoriesCountPromise);

    const categoryCount: Record<string, number>[] = [];

    categories.forEach((category, i) => {
        categoryCount.push({
            [category]: Math.round((categoriesCount[i] / productsCount) * 100),
        });
    });

    return categoryCount;
};

interface MyDocument extends MongooseDoc {
    createdAt: Date
    discount?: number;
    total?: number;
}

type funcProps = { length: number, docArr: MyDocument[], today: Date, property?: "discount" | "total"; }

export const getChartData = ({
    length,
    docArr,
    today,
    property,
}: funcProps) => {
    const data: number[] = new Array(length).fill(0);

    docArr.forEach((i) => {
        const creationDate = i.createdAt;
        const monthDiff = (today.getMonth() - creationDate.getMonth() + 12) % 12;

        if (monthDiff < length) {
            if (property) {
                data[length - monthDiff - 1] += i[property]!;
            } else {
                data[length - monthDiff - 1] += 1;
            }
        }
    });

    return data;
};