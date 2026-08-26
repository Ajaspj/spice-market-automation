import { Worker } from "bullmq";

import { redisConnection } from "../config/redis.js";

import {
  collectAndSaveTodayAuctions,
} from "../modules/auction/auction.service.js";

import {
  createNotificationsForAuction,
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
      // CREATE FARMER NOTIFICATIONS
      // ==========================================

      for (const record of result.records) {
        await createNotificationsForAuction(
          record.auction.id
        );
      }

      console.log(
        "🎉 Today's auction processing completed."
      );

      return result;
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

auctionWorker.on(
  "completed",
  (job) => {
    console.log(
      `✅ Auction job ${job.id} completed`
    );
  }
);

auctionWorker.on(
  "failed",
  (job, error) => {
    console.error(
      `❌ Auction job ${job?.id} failed`
    );

    console.error(error);
  }
);