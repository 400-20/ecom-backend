import express, { RequestHandler } from 'express';
import { adminOnly } from '../middlewares/auth.js';
import { deleteProduct, getAdminProducts, getAllCategories, getAllProducts, getLatestProducts, getSingleProduct, newProduct, UpdateProduct } from '../controllers/product.js';
import { singleUpload } from '../middlewares/multer.js';

const app = express.Router();
// add new product  /api/v1/product/new?id=
app.post("/new", adminOnly as RequestHandler, singleUpload, newProduct as RequestHandler);
// get all products with filter  /api/v1/product/all
app.get("/all", getAllProducts as RequestHandler);
// get 5 latest products  /api/v1/product/latest
app.get("/latest", getLatestProducts as RequestHandler);
// getAllCategories  /api/v1/product/categories
app.get("/categories", getAllCategories as RequestHandler);
// get all products via admin  /api/v1/product/admin-products?id=
app.get("/admin-products",adminOnly as RequestHandler , getAdminProducts as RequestHandler);
// getSingleProduct, UpdateProduct, deleteProduct /api/v1/product/dynamicID      ?id= for adminOnly
app
    .route("/:id")
    .get(getSingleProduct as RequestHandler)
    .put(adminOnly as RequestHandler ,singleUpload, UpdateProduct as RequestHandler)
    .delete(adminOnly as RequestHandler ,deleteProduct as RequestHandler)

export default app;