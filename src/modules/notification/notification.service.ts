import { prisma } from "../../config/database.js";
import { whatsappQueue } from "../../jobs/whatsapp.queue.js";

interface FarmerPrice {
  spiceName: string;
  marketName: string;
  minimumPrice: number;
  maximumPrice: number;
  averagePrice: number;
  quantityArrived: number | null;
  quantitySold: number | null;
}

export async function createDailyFarmerNotifications(
  targetDate: Date
) {
  console.log("");
  console.log("================================");
  console.log("📱 DAILY FARMER NOTIFICATIONS");
  console.log("================================");

  // ==========================================
  // GET DATE RANGE IN INDIA
  // ==========================================

  const dateString =
    targetDate.toLocaleDateString(
      "en-CA",
      {
        timeZone: "Asia/Kolkata",
      }
    );

  const startOfDay = new Date(
    `${dateString}T00:00:00+05:30`
  );

  const nextDay = new Date(
    startOfDay.getTime() +
      24 * 60 * 60 * 1000
  );

  console.log(
    `🔎 Searching auctions from ${startOfDay.toISOString()} to ${nextDay.toISOString()}`
  );

  // ==========================================
  // FIND COMPLETED AUCTIONS
  // ==========================================

  const auctions =
    await prisma.auction.findMany({
      where: {
        auctionDate: {
          gte: startOfDay,
          lt: nextDay,
        },

        status: "COMPLETED",
      },

      include: {
        market: true,

        prices: {
          include: {
            spice: true,
          },
        },
      },

      orderBy: {
        auctionDate: "asc",
      },
    });

  console.log(
    `🏪 Completed auctions: ${auctions.length}`
  );

  // ==========================================
  // NO COMPLETED AUCTIONS
  // ==========================================

  if (auctions.length === 0) {
    console.log(
      "⏳ No completed auctions found."
    );

    return {
      completed: false,
      created: 0,
      skipped: 0,
      message:
        "No completed auctions available.",
    };
  }

  // ==========================================
  // GET FARMERS
  // ==========================================

  const farmers =
    await prisma.farmer.findMany({
      where: {
        whatsappEnabled: true,
      },

      include: {
        spices: {
          include: {
            spice: true,
          },
        },
      },
    });

  console.log(
    `👨‍🌾 Farmers enabled for WhatsApp: ${farmers.length}`
  );

  let created = 0;
  let skipped = 0;

  // ==========================================
  // PROCESS EACH FARMER
  // ==========================================

  for (const farmer of farmers) {
    const subscribedSpiceIds =
      new Set(
        farmer.spices.map(
          (farmerSpice) =>
            farmerSpice.spiceId
        )
      );

    // ========================================
    // COLLECT FARMER PRICES
    // ========================================

    const farmerPrices: FarmerPrice[] = [];

    for (const auction of auctions) {
      for (const price of auction.prices) {
        if (
          !subscribedSpiceIds.has(
            price.spiceId
          )
        ) {
          continue;
        }

        farmerPrices.push({
          spiceName:
            price.spice.name,

          marketName:
            auction.market.name,

          minimumPrice:
            Number(
              price.minimumPrice
            ),

          maximumPrice:
            Number(
              price.maximumPrice
            ),

          averagePrice:
            Number(
              price.averagePrice
            ),

          quantityArrived:
            price.quantityArrived === null
              ? null
              : Number(
                  price.quantityArrived
                ),

          quantitySold:
            price.quantitySold === null
              ? null
              : Number(
                  price.quantitySold
                ),
        });
      }
    }

    // ========================================
    // NO RELEVANT PRICES
    // ========================================

    if (farmerPrices.length === 0) {
      console.log(
        `⏭️ No subscribed prices for ${farmer.name}`
      );

      continue;
    }

    // ========================================
    // BUILD DAILY MESSAGE
    // ========================================

    const message =
      buildDailyFarmerMessage(
        farmer.name,
        dateString,
        farmerPrices
      );

    // ========================================
    // DATABASE NOTIFICATION
    // ========================================

    try {
      /*
       * A daily summary can contain multiple
       * auctions.
       *
       * Our current Notification schema has
       * farmerId + notificationDate as the
       * unique daily identifier.
       *
       * We use the first completed auction as
       * the representative auction.
       */

      const representativeAuction =
        auctions[0];

      if (!representativeAuction) {
        continue;
      }

      const notificationDate =
        new Date(
          `${dateString}T00:00:00+05:30`
        );

      const notification =
        await prisma.notification.create({
          data: {
            farmerId: farmer.id,

            auctionId:
              representativeAuction.id,

            notificationDate,

            message,

            status: "PENDING",
          },
        });

      // ======================================
      // ADD TO WHATSAPP QUEUE
      // ======================================

      await whatsappQueue.add(
        "send-whatsapp",
        {
          notificationId:
            notification.id,
        },
        {
          /*
           * Deterministic job ID.
           *
           * Prevents the same notification
           * from being queued multiple times
           * while the BullMQ job still exists.
           */
          jobId:
            `notification-${notification.id}`,

          attempts: 5,

          backoff: {
            type: "exponential",
            delay: 5000,
          },

          removeOnComplete: 100,

          removeOnFail: 500,
        }
      );

      created++;

      console.log(
        `📤 Queued daily update for ${farmer.name}`
      );
    } catch (error: any) {
      // ======================================
      // DUPLICATE NOTIFICATION
      // ======================================

      if (error?.code === "P2002") {
        skipped++;

        console.log(
          `⏭️ Daily notification already exists for ${farmer.name}`
        );

        continue;
      }

      throw error;
    }
  }

  // ==========================================
  // SUMMARY
  // ==========================================

  console.log("");

  console.log(
    `📱 Notifications created: ${created}`
  );

  console.log(
    `⏭️ Notifications skipped: ${skipped}`
  );

  return {
    completed: true,
    created,
    skipped,
    message:
      "Daily farmer notifications processed successfully.",
  };
}

// ==================================================
// BUILD DAILY FARMER MESSAGE
// ==================================================

function buildDailyFarmerMessage(
  farmerName: string,
  dateString: string,
  prices: FarmerPrice[]
): string {
  const formattedDate =
    new Date(
      `${dateString}T00:00:00+05:30`
    ).toLocaleDateString(
      "en-IN",
      {
        timeZone: "Asia/Kolkata",
        day: "2-digit",
        month: "long",
        year: "numeric",
      }
    );

  let message =
    `🌶️ SPICE MARKET DAILY UPDATE\n\n`;

  message +=
    `Hello ${farmerName} 👋\n\n`;

  message +=
    `📅 ${formattedDate}\n\n`;

  // ==========================================
  // GROUP BY SPICE
  // ==========================================

  const grouped =
    new Map<
      string,
      FarmerPrice[]
    >();

  for (const price of prices) {
    const existing =
      grouped.get(
        price.spiceName
      ) ?? [];

    existing.push(price);

    grouped.set(
      price.spiceName,
      existing
    );
  }

  // ==========================================
  // BUILD SPICE SECTIONS
  // ==========================================

  for (
    const [
      spiceName,
      spicePrices,
    ] of grouped
  ) {
    message +=
      `🌱 ${spiceName.toUpperCase()}\n\n`;

    for (const price of spicePrices) {
      message +=
        `🏪 ${price.marketName}\n`;

      message +=
        `🔻 Lowest: ₹${price.minimumPrice.toFixed(
          2
        )}/kg\n`;

      message +=
        `🔺 Highest: ₹${price.maximumPrice.toFixed(
          2
        )}/kg\n`;

      message +=
        `📊 Average: ₹${price.averagePrice.toFixed(
          2
        )}/kg\n`;

      if (
        price.quantityArrived !== null
      ) {
        message +=
          `📦 Arrived: ${price.quantityArrived.toFixed(
            3
          )} kg\n`;
      }

      if (
        price.quantitySold !== null
      ) {
        message +=
          `✅ Sold: ${price.quantitySold.toFixed(
            3
          )} kg\n`;
      }

      message += "\n";
    }
  }

  message +=
    `📊 Completed auctions: ${new Set(
      prices.map(
        (price) =>
          price.marketName
      )
    ).size}\n\n`;

  message +=
    `🌾 Spice Market Automation`;

  return message;
}

// ==================================================
// COMPATIBILITY FUNCTION
// ==================================================

export async function createNotificationsForAuction(
  auctionId: string
) {
  console.log(
    "⚠️ createNotificationsForAuction() is using the daily notification system."
  );

  const auction =
    await prisma.auction.findUnique({
      where: {
        id: auctionId,
      },
    });

  if (!auction) {
    throw new Error(
      `Auction ${auctionId} not found.`
    );
  }

  return createDailyFarmerNotifications(
    auction.auctionDate
  );
}