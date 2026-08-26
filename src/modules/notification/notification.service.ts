import { prisma } from "../../config/database.js";
import { whatsappQueue } from "../../jobs/whatsapp.queue.js";

export async function createNotificationsForAuction(
  auctionId: string
) {
  console.log("");
  console.log("📱 Creating farmer notifications...");

  const auction = await prisma.auction.findUnique({
    where: {
      id: auctionId,
    },
    include: {
      market: true,
      prices: {
        include: {
          spice: true,
        },
      },
    },
  });

  if (!auction) {
    throw new Error(
      `Auction ${auctionId} not found.`
    );
  }

  if (auction.status !== "COMPLETED") {
    console.log(
      "⏳ Auction is not completed. No notifications created."
    );

    return {
      created: 0,
      skipped: 0,
    };
  }

  const farmers = await prisma.farmer.findMany({
    where: {
      whatsappEnabled: true,
    },
    include: {
      spices: true,
    },
  });

  let created = 0;
  let skipped = 0;

  for (const farmer of farmers) {
    const farmerSpiceIds = new Set(
      farmer.spices.map(
        (farmerSpice) => farmerSpice.spiceId
      )
    );

    const farmerPrices = auction.prices.filter(
      (price) =>
        farmerSpiceIds.has(price.spiceId)
    );

    if (farmerPrices.length === 0) {
      continue;
    }

    const message = buildFarmerMessage(
      farmer.name,
      auction,
      farmerPrices
    );

    try {
      const notification =
  await prisma.notification.create({
    data: {
      farmerId: farmer.id,
      auctionId: auction.id,
      message,
      status: "PENDING",
    },
  });

await whatsappQueue.add(
  "send-whatsapp",
  {
    notificationId: notification.id,
  },
  {
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
    } catch (error: any) {
      // PostgreSQL unique constraint:
      // farmerId + auctionId
      //
      // means this farmer already has
      // a notification for this auction.

      if (error?.code === "P2002") {
        skipped++;

        console.log(
          `⏭️ Notification already exists for ${farmer.name}`
        );

        continue;
      }

      throw error;
    }
  }

  console.log(
    `📱 Notifications created: ${created}`
  );

  console.log(
    `⏭️ Notifications skipped: ${skipped}`
  );

  return {
    created,
    skipped,
  };
}

function buildFarmerMessage(
  farmerName: string,
  auction: any,
  prices: any[]
): string {
  const date = auction.auctionDate
    .toLocaleDateString("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "2-digit",
      month: "long",
      year: "numeric",
    });

  let message =
    `🌶️ SPICE MARKET UPDATE\n\n`;

  message += `Hello ${farmerName},\n\n`;

  message += `📅 ${date}\n`;

  message += `🏪 ${auction.market.name}\n\n`;

  for (const price of prices) {
    message += `🌱 ${price.spice.name}\n`;

    message += `🔻 Lowest: ₹${Number(
      price.minimumPrice
    ).toFixed(2)}/kg\n`;

    message += `🔺 Highest: ₹${Number(
      price.maximumPrice
    ).toFixed(2)}/kg\n`;

    message += `📊 Average: ₹${Number(
      price.averagePrice
    ).toFixed(2)}/kg\n`;

    if (price.quantityArrived !== null) {
      message += `📦 Arrived: ${Number(
        price.quantityArrived
      ).toFixed(3)} kg\n`;
    }

    if (price.quantitySold !== null) {
      message += `✅ Sold: ${Number(
        price.quantitySold
      ).toFixed(3)} kg\n`;
    }

    message += `\n`;
  }

  message +=
    `🌾 Spice Market Automation`;

  return message;
}