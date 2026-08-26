import { Request, Response } from "express";

import { collectAndSaveTodayAuctions } from "./auction.service.js";

export async function getTodayAuctions(
  _req: Request,
  res: Response
) {
  try {
    const today = new Date();

    const result =
      await collectAndSaveTodayAuctions(today);

    return res.json(result);
  } catch (error) {
    console.error("Auction collection failed:", error);

    return res.status(500).json({
      completed: false,
      message: "Failed to collect today's auction data.",
      records: [],
    });
  }
}

export async function getAuctionsByDate(
  req: Request,
  res: Response
) {
  try {
    const dateParam = req.params.date;

    // Express can type a route parameter as string | string[].
    if (typeof dateParam !== "string") {
      return res.status(400).json({
        message: "Invalid date parameter.",
      });
    }

    // Validate YYYY-MM-DD
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

    if (!dateRegex.test(dateParam)) {
      return res.status(400).json({
        message: "Date must be YYYY-MM-DD",
      });
    }

    // Validate that the date actually exists.
    const parsedDate = new Date(
      `${dateParam}T00:00:00+05:30`
    );

    if (Number.isNaN(parsedDate.getTime())) {
      return res.status(400).json({
        message: "Invalid date.",
      });
    }

    const result =
      await collectAndSaveTodayAuctions(parsedDate);

    return res.json(result);
  } catch (error) {
    console.error("Auction collection failed:", error);

    return res.status(500).json({
      completed: false,
      message: "Failed to collect auction data.",
      records: [],
    });
  }
}