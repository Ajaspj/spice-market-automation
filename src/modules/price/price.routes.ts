import { Router } from "express";

import {
  getPriceComparison,
} from "./price.controller.js";

const router = Router();

router.get(
  "/comparison/:priceId",
  getPriceComparison
);

export default router;