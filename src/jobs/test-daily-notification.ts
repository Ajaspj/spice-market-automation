import "dotenv/config";

import { prisma } from "../config/database.js";

import {
  createDailyFarmerNotifications,
} from "../modules/notification/notification.service.js";

async function main() {
  console.log("");
  console.log("================================");
  console.log("🌶️ DAILY NOTIFICATION TEST");
  console.log("================================");

  // ==========================================
  // FIND CARDAMOM
  // ==========================================

  const cardamom =
    await prisma.spice.findUnique({
      where: {
        slug: "cardamom",
      },
    });

  if (!cardamom) {
    throw new Error(
      "Cardamom was not found in the database."
    );
  }

  console.log(
    `🌱 Spice: ${cardamom.name}`
  );

  // ==========================================
  // CREATE / FIND TEST FARMER
  // ==========================================

  const phoneNumber =
    process.env.TEST_WHATSAPP_NUMBER;

  if (!phoneNumber) {
    throw new Error(
      "TEST_WHATSAPP_NUMBER is missing from .env"
    );
  }

  const farmer =
    await prisma.farmer.upsert({
      where: {
        phoneNumber,
      },

      update: {
        name: "Test Farmer",
        whatsappEnabled: true,
      },

      create: {
        name: "Test Farmer",
        phoneNumber,
        whatsappEnabled: true,
      },
    });

  console.log(
    `👨‍🌾 Farmer: ${farmer.name}`
  );

  // ==========================================
  // SUBSCRIBE TO CARDAMOM
  // ==========================================

  await prisma.farmerSpice.upsert({
    where: {
      farmerId_spiceId: {
        farmerId: farmer.id,
        spiceId: cardamom.id,
      },
    },

    update: {},

    create: {
      farmerId: farmer.id,
      spiceId: cardamom.id,
    },
  });

  console.log(
    "✅ Farmer subscribed to Cardamom."
  );

  // ==========================================
  // FIND EXISTING COMPLETED AUCTION
  // ==========================================

  const auction =
    await prisma.auction.findFirst({
      where: {
        status: "COMPLETED",

        prices: {
          some: {
            spiceId: cardamom.id,
          },
        },
      },

      orderBy: {
        auctionDate: "asc",
      },
    });

  if (!auction) {
    throw new Error(
      "No completed Cardamom auction found."
    );
  }

  console.log("");
  console.log(
    `🧪 Using auction date: ${auction.auctionDate.toISOString()}`
  );

  // ==========================================
  // GENERATE DAILY NOTIFICATION
  // ==========================================

  const result =
    await createDailyFarmerNotifications(
      auction.auctionDate
    );

  console.log("");
  console.log("================================");
  console.log("📊 TEST RESULT");
  console.log("================================");

  console.dir(result, {
    depth: null,
  });
}

main()
  .catch((error) => {
    console.error("");
    console.error(
      "❌ Daily notification test failed:"
    );

    console.error(error);

    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });