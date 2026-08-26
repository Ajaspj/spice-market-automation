import { auctionQueue } from "./auction.queue.js";

export async function setupAuctionScheduler() {
  await auctionQueue.upsertJobScheduler(
    "daily-auction-monitor",

    {
      every: 30 * 60 * 1000,
    },

    {
      name: "check-auction",
      data: {
        source: "spices-board",
      },

      opts: {
        attempts: 3,

        backoff: {
          type: "exponential",
          delay: 5000,
        },

        removeOnComplete: 100,
        removeOnFail: 500,
      },
    }
  );

  console.log(
    "⏰ Auction scheduler configured."
  );

  console.log(
    "🔄 Checking every 30 minutes."
  );
}