import { Request, Response } from "express";

import { compareAuctionPrice } from "./price.service.js";

export async function getPriceComparison(
  req: Request,
  res: Response
) {
  try {
    const priceId = req.params.priceId;

    if (typeof priceId !== "string") {
      return res.status(400).json({
        message: "Invalid price ID.",
      });
    }

    const comparison =
      await compareAuctionPrice(priceId);

    return res.json(comparison);
  } catch (error) {
    console.error(
      "Price comparison failed:",
      error
    );

    return res.status(500).json({
      message: "Failed to compare price.",
    });
  }
}