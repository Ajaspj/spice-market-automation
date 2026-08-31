import "dotenv/config";
import { prisma } from "../config/database.js";
import { whatsappQueue } from "./whatsapp.queue.js";

async function main() {
  console.log("");
  console.log("================================");
  console.log("🔄 REQUEUE PENDING NOTIFICATIONS");
  console.log("================================");

  const notifications =
    await prisma.notification.findMany({
      where: {
        status: "PENDING",
      },

      include: {
        farmer: true,
      },

      orderBy: {
        createdAt: "asc",
      },
    });

  console.log(
    `📱 Pending notifications: ${notifications.length}`
  );

  let queued = 0;

  for (const notification of notifications) {
    if (!notification.farmer.whatsappEnabled) {
      console.log(
        `🚫 WhatsApp disabled: ${notification.farmer.name}`
      );

      continue;
    }

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

    queued++;

    console.log(
      `📤 Requeued: ${notification.id}`
    );
  }

  console.log("");
  console.log(
    `✅ Notifications queued: ${queued}`
  );

  await prisma.$disconnect();
}

main()
  .catch(async (error) => {
    console.error(
      "❌ Requeue failed:"
    );

    console.error(error);

    await prisma.$disconnect();

    process.exit(1);
  });