import express, { RequestHandler } from 'express'
import { allOrders, deleteOrder, getSingleOrder, myOrders, newOrder, processOrder } from '../controllers/order.js';
import { adminOnly } from '../middlewares/auth.js';

const app = express.Router();

// route - /api/v1/order/new
app.post("/new", newOrder as RequestHandler);
// route - /api/v1/order/my
app.get("/my", myOrders as RequestHandler)
// route - /api/v1/order/all
app.get("/all", adminOnly as RequestHandler, allOrders as RequestHandler)

app
    .route("/:id")
    .get(getSingleOrder as RequestHandler)
    .put(adminOnly as RequestHandler, processOrder as RequestHandler)
    .delete(adminOnly as RequestHandler, deleteOrder as RequestHandler)

export default app;