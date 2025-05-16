import express, { RequestHandler } from 'express';
import { deleteUser, getAllUsers, getUser, newUser } from '../controllers/user.js';
import { adminOnly } from '../middlewares/auth.js';

const app = express.Router();

//  api is /api/v1/user/new post req for new user
app.post("/new", newUser as RequestHandler)
//  api is /api/v1/user/all get req for all users
app.get("/all", adminOnly as RequestHandler, getAllUsers as RequestHandler)
//  api is /api/v1/user/dynamicID?id= get req for all users
app.get("/:id", getUser as RequestHandler)
//  api is /api/v1/user/dynamicID?id= get req for all users
app.delete("/:id", adminOnly as RequestHandler, deleteUser as RequestHandler)

// as root for getUser and deleteUser is same /:id we can also write like 
// app.route("/:id").get(getUser).delete(deleteUser)

export default app;