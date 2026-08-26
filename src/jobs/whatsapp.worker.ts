import { Worker } from "bullmq";

import { redisConnection } from "../config/redis.js";

import { prisma } from "../config/database.js";

export const whatsappWorker = new Worker(
  "whatsapp-notifications",

  async (job) => {
    const { notificationId } = job.data;

    console.log("");
    console.log("================================");
    console.log("📱 WHATSAPP WORKER");
    console.log("================================");

    console.log(
      `🆔 Notification: ${notificationId}`
    );

    const notification =
      await prisma.notification.findUnique({
        where: {
          id: notificationId,
        },
        include: {
          farmer: true,
        },
      });

    if (!notification) {
      throw new Error(
        `Notification ${notificationId} not found.`
      );
    }

    if (notification.status === "SENT") {
      console.log(
        "⏭️ Notification already sent."
      );

      return {
        sent: true,
        skipped: true,
      };
    }

    if (!notification.farmer.whatsappEnabled) {
      console.log(
        "🚫 Farmer has disabled WhatsApp."
      );

      await prisma.notification.update({
        where: {
          id: notification.id,
        },

        data: {
          status: "CANCELLED",
        },
      });

      return {
        sent: false,
        skipped: true,
      };
    }

    // ==========================================
    // TEST MODE
    // ==========================================

    console.log(
      "🧪 WhatsApp TEST MODE"
    );

    console.log(
      `👨‍🌾 Farmer: ${notification.farmer.name}`
    );

    console.log(
      `📞 Phone: ${notification.farmer.phoneNumber}`
    );

    console.log("");
    console.log("MESSAGE:");
    console.log("--------------------------------");
    console.log(notification.message);
    console.log("--------------------------------");

    // Simulate successful delivery
    await prisma.notification.update({
      where: {
        id: notification.id,
      },

      data: {
        status: "SENT",
        sentAt: new Date(),
      },
    });

    console.log(
      "✅ TEST MESSAGE SENT"
    );

    return {
      sent: true,
      testMode: true,
    };
  },

  {
    connection: redisConnection,

    concurrency: 1,

    limiter: {
      max: 10,
      duration: 1000,
    },
  }
);

whatsappWorker.on(
  "completed",
  (job) => {
    console.log(
      `✅ WhatsApp job ${job.id} completed`
    );
  }
);

whatsappWorker.on(
  "failed",
  (job, error) => {
    console.error(
      `❌ WhatsApp job ${job?.id} failed`
    );

    console.error(error);
  }
);