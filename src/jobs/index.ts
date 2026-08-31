import "./auction.worker.js";
import "./whatsapp.worker.js";

import {
  setupAuctionScheduler,
} from "./auction.scheduler.js";

export async function startJobs(): Promise<void> {
  console.log("");
  console.log("==========================================");
  console.log("🚀 STARTING BACKGROUND JOBS");
  console.log("==========================================");

  // ------------------------------------------
  // WhatsApp Worker
  // ------------------------------------------

  console.log("📱 WhatsApp worker initialized.");

  // ------------------------------------------
  // Auction Scheduler
  // ------------------------------------------

  await setupAuctionScheduler();

  console.log("⏰ Auction scheduler initialized.");

  console.log("");
  console.log("==========================================");
  console.log("✅ BACKGROUND JOBS READY");
  console.log("==========================================");
}