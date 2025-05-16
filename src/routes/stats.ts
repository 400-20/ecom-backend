import express, { RequestHandler } from 'express';
import { adminOnly } from '../middlewares/auth.js';
import { getBarCharts, getDahboardStats, getLineCharts, getPieCharts } from '../controllers/stats.js';

const app = express.Router();

//  api is /api/v1/dashboard/stats 
app.get("/stats", adminOnly as RequestHandler, getDahboardStats as RequestHandler)

//  api is /api/v1/dashboard/pie 
app.get("/pie", adminOnly as RequestHandler, getPieCharts as RequestHandler)

//  api is /api/v1/dashboard/bar 
app.get("/bar", adminOnly as RequestHandler, getBarCharts as RequestHandler)

//  api is /api/v1/dashboard/line 
app.get("/line", adminOnly as RequestHandler, getLineCharts as RequestHandler)


export default app;