import { Worker } from "bullmq";

import { redisConnection } from "../config/redis.js";

import {
  collectAndSaveTodayAuctions,
} from "../modules/auction/auction.service.js";

import {
  createDailyFarmerNotifications,
} from "../modules/notification/notification.service.js";

export const auctionWorker =
  new Worker(
    "spice-auction",

    async (job) => {
      console.log("");
      console.log("================================");
      console.log("🌶️ AUCTION CHECK");
      console.log("================================");

      console.log(`🆔 Job: ${job.id}`);

      const today = new Date();

      // ==========================================
      // COLLECT TODAY'S AUCTIONS
      // ==========================================

      const result =
        await collectAndSaveTodayAuctions(
          today
        );

      if (!result.completed) {
        console.log(
          "⏳ Today's auction is not available yet."
        );

        return {
          completed: false,
          records: [],
        };
      }

      console.log(
        `✅ Found ${result.records.length} auction records`
      );

      // ==========================================
      // CREATE ONE DAILY NOTIFICATION
      // PER FARMER
      // ==========================================

      const notificationResult =
        await createDailyFarmerNotifications(
          today
        );

      console.log("");

      console.log(
        `📱 Farmer notifications created: ${notificationResult.created}`
      );

      console.log(
        `⏭️ Farmer notifications skipped: ${notificationResult.skipped}`
      );

      console.log(
        "🎉 Today's auction processing completed."
      );

      return {
        completed: true,

        auctionRecords:
          result.records.length,

        notificationsCreated:
          notificationResult.created,

        notificationsSkipped:
          notificationResult.skipped,
      };
    },

    {
      connection: redisConnection,

      concurrency: 1,

      limiter: {
        max: 1,
        duration: 60000,
      },
    }
  );

// ==========================================
// JOB COMPLETED
// ==========================================

auctionWorker.on(
  "completed",
  (job) => {
    console.log(
      `✅ Auction job ${job.id} completed`
    );
  }
);

// ==========================================
// JOB FAILED
// ==========================================

auctionWorker.on(
  "failed",
  (job, error) => {
    console.error(
      `❌ Auction job ${job?.id} failed`
    );

    console.error(error);
  }
);