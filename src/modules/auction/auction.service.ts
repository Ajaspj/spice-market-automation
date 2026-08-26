import { prisma } from "../../config/database.js";

import { collectTodayAuctions } from "./auction.collector.js";
import { validateAuctionRecord } from "./auction.validator.js";

export async function collectAndSaveTodayAuctions(
  targetDate: Date
) {
  const result = await collectTodayAuctions(targetDate);

  if (!result.completed) {
    return {
      completed: false,
      message: "Today's auction data is not available yet.",
      records: [],
    };
  }

  const cardamom = await prisma.spice.findUnique({
    where: {
      slug: "cardamom",
    },
  });

  if (!cardamom) {
    throw new Error(
      "Cardamom spice is missing from the database."
    );
  }

  const savedAuctions = [];

  for (const record of result.records) {
    const valid = validateAuctionRecord(record);

    if (!valid) {
      console.warn(
        `⚠️ Invalid auction record skipped: ${record.auctioneer}`
      );

      continue;
    }

    const marketName = record.auctioneer;

    let market = await prisma.market.findFirst({
      where: {
        name: marketName,
      },
    });

    if (!market) {
      market = await prisma.market.create({
        data: {
          name: marketName,
          location: "Kerala",
        },
      });
    }

    const auctionDate = new Date(
      `${record.date}T00:00:00+05:30`
    );

    const auction = await prisma.auction.upsert({
      where: {
        marketId_auctionDate: {
          marketId: market.id,
          auctionDate,
        },
      },
      update: {
        status: "COMPLETED",
        completedAt: new Date(),
      },
      create: {
        marketId: market.id,
        auctionDate,
        status: "COMPLETED",
        completedAt: new Date(),
      },
    });

    const auctionPrice = await prisma.auctionPrice.upsert({
      where: {
        auctionId_spiceId: {
          auctionId: auction.id,
          spiceId: cardamom.id,
        },
      },
      update: {
        minimumPrice: record.minimumPrice,
        maximumPrice: record.maximumPrice,
        averagePrice: record.averagePrice,
        quantityArrived: record.quantityArrived,
        quantitySold: record.quantitySold,
      },
      create: {
        auctionId: auction.id,
        spiceId: cardamom.id,
        minimumPrice: record.minimumPrice,
        maximumPrice: record.maximumPrice,
        averagePrice: record.averagePrice,
        quantityArrived: record.quantityArrived,
        quantitySold: record.quantitySold,
      },
    });

    savedAuctions.push({
      auction,
      auctionPrice,
      auctioneer: record.auctioneer,
    });
  }

  return {
    completed: savedAuctions.length > 0,
    message:
      savedAuctions.length > 0
        ? "Today's auction data collected successfully."
        : "Auction records were found but none passed validation.",
    records: savedAuctions,
  };
}
