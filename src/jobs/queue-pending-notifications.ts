import "dotenv/config";

import { prisma } from "../config/database.js";

import { whatsappQueue } from "./whatsapp.queue.js";

async function main() {
  console.log("");
  console.log("================================");
  console.log("📱 QUEUE PENDING NOTIFICATIONS");
  console.log("================================");

  const notifications =
    await prisma.notification.findMany({
      where: {
        status: "PENDING",
      },
    });

  console.log(
    `📊 Found ${notifications.length} pending notifications.`
  );

  for (const notification of notifications) {
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

    console.log(
      `📤 Queued notification ${notification.id}`
    );
  }

  console.log("");
  console.log("✅ All pending notifications queued.");
}

main()
  .catch((error) => {
    console.error(
      "❌ Failed to queue notifications:",
      error
    );

    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });