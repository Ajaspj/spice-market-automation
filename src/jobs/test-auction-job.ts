import { auctionQueue } from "./auction.queue.js";

async function main() {
  console.log("");
  console.log("================================");
  console.log("🌶️ MANUAL AUCTION JOB TEST");
  console.log("================================");

  console.log("📤 Adding auction job to BullMQ...");

  const job = await auctionQueue.add(
    "manual-auction-check",
    {
      source: "manual-test",
    },
    {
      attempts: 1,
      removeOnComplete: false,
      removeOnFail: false,
    }
  );

  console.log(`✅ Job added successfully.`);
  console.log(`🆔 Job ID: ${job.id}`);
  console.log("");
  console.log("📱 The auction worker should process it now.");
  console.log("");
}

main()
  .catch((error) => {
    console.error("❌ Failed to add auction job:");
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await auctionQueue.close();
  });