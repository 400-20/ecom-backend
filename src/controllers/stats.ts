import { myCache } from "../app.js";
import { TryCatch } from "../middlewares/error.js";
import { Order } from "../models/order.js";
import { Product } from "../models/product.js";
import { User } from "../models/user.js";
import { calculatePercentage, getChartData, getInventories } from "../utils/features.js";

export const getDahboardStats = TryCatch(async (req, res, next) => {
    let stats;
    if (myCache.has("admin-stats")) stats = JSON.parse(myCache.get("admin-stats") as string)
    else {
        const today = new Date();
        const sixMonthAgo = new Date();
        sixMonthAgo.setMonth(sixMonthAgo.getMonth() - 6);
        const thisMonth = {
            start: new Date(today.getFullYear(), today.getMonth(), 1),
            end: today
        }
        const lastMonth = {
            start: new Date(today.getFullYear(), today.getMonth() - 1, 1),
            end: new Date(today.getFullYear(), today.getMonth(), 0)
        }
        const thisMonthProductsPromise = Product.find({
            createdAt: {
                $gte: thisMonth.start,
                $lte: thisMonth.end
            }
        })
        const lastMonthProductsPromise = Product.find({
            createdAt: {
                $gte: lastMonth.start,
                $lte: lastMonth.end
            }
        })
        const thisMonthUserPromise = User.find({
            createdAt: {
                $gte: thisMonth.start,
                $lte: thisMonth.end
            }
        })
        const lastMonthUserPromise = User.find({
            createdAt: {
                $gte: lastMonth.start,
                $lte: lastMonth.end
            }
        })
        const thisMonthOrderPromise = Order.find({
            createdAt: {
                $gte: thisMonth.start,
                $lte: thisMonth.end
            }
        })
        const lastMonthOrderPromise = Order.find({
            createdAt: {
                $gte: lastMonth.start,
                $lte: lastMonth.end
            }
        })
        const lastSixMonthOrderPromise = Order.find({
            createdAt: {
                $gte: sixMonthAgo,
                $lte: today
            }
        })
        const latestTransactionsPromise = Order.find({}).select(["orderItems", "discount", "total", "status"]).limit(4)

        const [thisMonthProducts, thisMonthUser, thisMonthOrder, lastMonthProducts, lastMonthUser, lastMonthOrder, productsCount, usersCount, allOrders, lastSixMonthOrder, categories, feamaleUsersCount, latestTranaction] = await Promise.all([
            thisMonthProductsPromise,
            thisMonthUserPromise,
            thisMonthOrderPromise,
            lastMonthProductsPromise,
            lastMonthUserPromise,
            lastMonthOrderPromise,
            Product.countDocuments(),
            User.countDocuments(),
            Order.find({}).select("total"),
            lastSixMonthOrderPromise,
            Product.distinct("category"),
            User.countDocuments({ gender: "female" }),
            latestTransactionsPromise
        ])
        const thisMonthRevenue = thisMonthOrder.reduce((acc, curr) => acc + (curr.total || 0), 0)
        const lastMonthRevenue = lastMonthOrder.reduce((acc, curr) => acc + (curr.total || 0), 0)

        const percentChange = {
            revenue: calculatePercentage(thisMonthRevenue, lastMonthRevenue),
            product: calculatePercentage(thisMonthProducts.length, lastMonthProducts.length),
            user: calculatePercentage(thisMonthUser.length, lastMonthUser.length),
            order: calculatePercentage(thisMonthOrder.length, lastMonthOrder.length)
        }

        const revenue = allOrders.reduce((acc, curr) => acc + (curr.total || 0), 0)
        const counts = {
            product: productsCount,
            user: usersCount,
            order: allOrders.length,
            revenue
        }
        const orderMonthCounts = new Array(6).fill(0)
        const orderMonthyRevenue = new Array(6).fill(0)

        lastSixMonthOrder.forEach((order) => {
            const creationDate = order.createdAt
            const monthDiff = (today.getMonth() - creationDate.getMonth() + 12) % 12;
            if (monthDiff < 6) {
                orderMonthCounts[6 - monthDiff - 1] += 1
                orderMonthyRevenue[6 - monthDiff - 1] += order.total
            }
        })

        const categoryCount: Record<string, number>[] = await getInventories({ categories, productsCount })

        const userRatio = {
            male: usersCount - feamaleUsersCount,
            female: feamaleUsersCount
        }

        const modifiedLatestTransaction = latestTranaction.map(i => ({
            _id: i._id,
            discount: i.discount,
            amount: i.total,
            quantity: i.orderItems.length,
            status: i.status
        }))

        stats = {
            categoryCount,
            percentChange,
            counts,
            chart: { order: orderMonthCounts, revenue: orderMonthyRevenue },
            userRatio,
            latestTranaction: modifiedLatestTransaction
        }

        myCache.set("admin-stats", JSON.stringify(stats))
    }

    return res.status(200).json({
        success: true,
        stats
    })
})

export const getPieCharts = TryCatch(async (req, res, next) => {
    let charts;
    if (myCache.has("admin-pie-charts")) charts = JSON.parse(myCache.get("admin-pie-charts") as string)
    else {
        const [processingOrder, shippedOrder, deliveredOrder, categories, productsCount, outOfStock, allOrders, allUsers, adminUsers, customerUsers] = await Promise.all([
            Order.countDocuments({ status: "Processing" }),
            Order.countDocuments({ status: "Shipped" }),
            Order.countDocuments({ status: "Delivered" }),
            Product.distinct("category"),
            Product.countDocuments(),
            Product.countDocuments({ stock: 0 }),
            Order.find({}).select(["total", "discount", "subtotal", "tax", "shippingCharges"]),
            User.find({}).select(["dob"]),
            User.countDocuments({ role: "admin" }),
            User.countDocuments({ role: "user" }),
        ])
        const orderFullfilment = {
            processing: processingOrder,
            shipped: shippedOrder,
            delivered: deliveredOrder,
        }
        const productCategories = await getInventories({ categories, productsCount })
        const stockavailability = {
            inStock: productsCount - outOfStock,
            outOfStock,
        }

        const grossIncome = allOrders.reduce((prev, order) => prev + (order.total || 0), 0)
        const discount = allOrders.reduce((prev, order) => prev + (order.discount || 0), 0)
        const productionCost = allOrders.reduce((prev, order) => prev + (order.shippingCharges || 0), 0)
        const burnt = allOrders.reduce((prev, order) => prev + (order.tax || 0), 0)
        const marketingCost = Math.round(grossIncome * (30 / 100))
        const netMargin = grossIncome - discount - productionCost - burnt - marketingCost

        const revenueDistribution = {
            netMargin, discount, productionCost, burnt, marketingCost
        }
        const usersAgeGroup = {
            teen: allUsers.filter((i) => i.age < 20).length,
            adult: allUsers.filter((i) => i.age >= 20 && i.age < 40).length,
            old: allUsers.filter((i) => i.age >= 40).length,
        }
        const adminCustomer = {
            admin: adminUsers,
            customer: customerUsers
        }

        charts = {
            orderFullfilment,
            productCategories,
            stockavailability,
            revenueDistribution,
            usersAgeGroup,
            adminCustomer
        }
        myCache.set("admin-pie-charts", JSON.stringify(charts))
    }

    return res.status(200).json({
        success: true,
        charts
    })
})

export const getBarCharts = TryCatch(async (req, res, next) => {
    let charts;
    const key = "admin-bar-charts"
    if (myCache.has(key)) charts = JSON.parse(myCache.get(key) as string);
    else {
        const today = new Date();
        const sixMonthAgo = new Date();
        sixMonthAgo.setMonth(sixMonthAgo.getMonth() - 6)
        const twelveMonthAgo = new Date();
        twelveMonthAgo.setMonth(twelveMonthAgo.getMonth() - 12)
        const sixMonthProductPromise = Product.find({
            createdAt: {
                $gte: sixMonthAgo,
                $lte: today
            }
        }).select("createdAt")
        const sixMonthUsersPromise = User.find({
            createdAt: {
                $gte: sixMonthAgo,
                $lte: today
            }
        }).select("createdAt")
        const twelveMonthOrdersPromise = Order.find({
            createdAt: {
                $gte: twelveMonthAgo,
                $lte: today
            }
        }).select("createdAt")
        const [products, users, orders] = await Promise.all([sixMonthProductPromise, sixMonthUsersPromise, twelveMonthOrdersPromise])
        const productCount = getChartData({length:6, today, docArr:products})
        const userCount = getChartData({length:6, today, docArr:users})
        const orderCount = getChartData({length:12, today, docArr:orders})
        charts = {
            users:userCount,
            products:productCount,
            orders:orderCount
        }
        myCache.set(key, JSON.stringify(charts));

    }
    return res.status(200).json({
        success: true,
        charts
    })

})

export const getLineCharts = TryCatch(async (req, res, next) => {
    let charts;
    const key = "admin-line-charts"
    if (myCache.has(key)) charts = JSON.parse(myCache.get(key) as string);
    else {
        const today = new Date();

        const twelveMonthAgo = new Date();
        twelveMonthAgo.setMonth(twelveMonthAgo.getMonth() - 12)

        const twelveMonthProductsPromise = Product.find({
            createdAt: {
                $gte: twelveMonthAgo,
                $lte: today
            }
        }).select("createdAt")
        const twelveMonthUsersPromise = User.find({
            createdAt: {
                $gte: twelveMonthAgo,
                $lte: today
            }
        }).select("createdAt")
        const twelveMonthOrdersPromise = Order.find({
            createdAt: {
                $gte: twelveMonthAgo,
                $lte: today
            }
        }).select(["createdAt","discount", "total"])
        const [products, users, orders] = await Promise.all([twelveMonthProductsPromise, twelveMonthUsersPromise, twelveMonthOrdersPromise])
        const productCount = getChartData({length:12, today, docArr:products})
        const userCount = getChartData({length:12, today, docArr:users})
        const discount = getChartData({length:12, today, docArr:orders, property:"discount"})
        const revenue = getChartData({length:12, today, docArr:orders, property:"total"})
        charts = {
            users:userCount,
            products:productCount,
            discount,
            revenue
        }
        myCache.set(key, JSON.stringify(charts));

    }
    return res.status(200).json({
        success: true,
        charts
    })
})