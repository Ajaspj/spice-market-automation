import { prisma } from "../../config/database.js";

import { PriceComparison } from "./price.types.js";

export async function compareAuctionPrice(
  auctionPriceId: string
): Promise<PriceComparison> {
  const currentPrice =
    await prisma.auctionPrice.findUnique({
      where: {
        id: auctionPriceId,
      },
      include: {
        spice: true,
        auction: true,
      },
    });

  if (!currentPrice) {
    throw new Error("Auction price not found.");
  }

  const previousPrice =
    await prisma.auctionPrice.findFirst({
      where: {
        spiceId: currentPrice.spiceId,

        auction: {
          auctionDate: {
            lt: currentPrice.auction.auctionDate,
          },
        },
      },

      orderBy: {
        auction: {
          auctionDate: "desc",
        },
      },
    });

  const currentAverage =
    Number(currentPrice.averagePrice);

  if (!previousPrice) {
    return {
      spiceId: currentPrice.spiceId,
      currentAverage,
      previousAverage: null,
      difference: 0,
      percentageChange: null,
      direction: "NEW",
    };
  }

  const previousAverage =
    Number(previousPrice.averagePrice);

  const difference =
    currentAverage - previousAverage;

  const percentageChange =
    previousAverage === 0
      ? 0
      : (difference / previousAverage) * 100;

  let direction:
    | "UP"
    | "DOWN"
    | "UNCHANGED";

  if (difference > 0) {
    direction = "UP";
  } else if (difference < 0) {
    direction = "DOWN";
  } else {
    direction = "UNCHANGED";
  }

  return {
    spiceId: currentPrice.spiceId,

    currentAverage,

    previousAverage,

    difference,

    percentageChange,

    direction,
  };
}