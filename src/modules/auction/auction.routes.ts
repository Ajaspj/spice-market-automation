import { Router } from "express";

import {
  getTodayAuctions,
  getAuctionsByDate,
} from "./auction.controller.js";

const router = Router();

router.get("/today", getTodayAuctions);

router.get("/date/:date", getAuctionsByDate);

export default router;