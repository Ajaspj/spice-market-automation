import "dotenv/config";

import { prisma } from "../config/database.js";
import { whatsappQueue } from "./whatsapp.queue.js";

async function main() {
  console.log("");
  console.log("================================");
  console.log("📱 WHATSAPP WORKER TEST");
  console.log("================================");

  // ==========================================
  // FIND TEST FARMER
  // ==========================================

  const farmer = await prisma.farmer.findUnique({
    where: {
      phoneNumber: "919562106384",
    },
  });

  if (!farmer) {
    throw new Error(
      "Test Farmer with phone 919562106384 was not found."
    );
  }

  console.log(
    `👨‍🌾 Farmer: ${farmer.name}`
  );

  console.log(
    `📞 Phone: ${farmer.phoneNumber}`
  );

  // ==========================================
  // CREATE FRESH NOTIFICATION
  // ==========================================

  const notificationDate = new Date();

  const message =
    "Cardamom - RNS SPICES: Lowest ₹2519.00/kg, Highest ₹3508.00/kg, Average ₹3073.45/kg; IDUKKI MAHILA CARDAMOM PRODUCER COMPANY LIMITED: Lowest ₹2310.00/kg, Highest ₹4159.00/kg, Average ₹3060.31/kg";

  const notification =
    await prisma.notification.create({
      data: {
        farmerId: farmer.id,

        // We need an auctionId because
        // Notification requires an Auction relation.
        //
        // Use the most recent completed auction.
        auctionId: await getLatestAuctionId(),

        notificationDate,

        message,

        status: "PENDING",
      },
    });

  console.log("");
  console.log(
    "✅ Fresh notification created."
  );

  console.log(
    `🆔 Notification ID: ${notification.id}`
  );

  // ==========================================
  // ADD TO WHATSAPP QUEUE
  // ==========================================

  const job =
    await whatsappQueue.add(
      "send-whatsapp",
      {
        notificationId:
          notification.id,
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

  console.log("");
  console.log(
    "📤 WhatsApp job added to BullMQ."
  );

  console.log(
    `🆔 Job ID: ${job.id}`
  );

  console.log("");
  console.log(
    "================================"
  );

  console.log(
    "🎉 TEST JOB CREATED SUCCESSFULLY"
  );

  console.log(
    "================================"
  );

  console.log("");
  console.log(
    "📱 The Docker WhatsApp worker should process it now."
  );

  console.log("");
  console.log(
    "Run this in another terminal:"
  );

  console.log(
    "docker compose logs -f app"
  );
}

// ==========================================
// GET LATEST AUCTION
// ==========================================

async function getLatestAuctionId(): Promise<string> {
  const auction =
    await prisma.auction.findFirst({
      where: {
        status: "COMPLETED",
      },

      orderBy: {
        auctionDate: "desc",
      },
    });

  if (!auction) {
    throw new Error(
      "No completed auction exists in the database."
    );
  }

  console.log(
    `🌶️ Using auction: ${auction.id}`
  );

  return auction.id;
}

// ==========================================
// RUN
// ==========================================

main()
  .catch((error) => {
    console.error("");
    console.error(
      "❌ WhatsApp worker test failed:"
    );
    console.error(error);

    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();

    await whatsappQueue.close();
  });