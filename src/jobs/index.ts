import "./auction.worker.js";
import "./whatsapp.worker.js";

import {
  setupAuctionScheduler,
} from "./auction.scheduler.js";

export async function startJobs() {
  await setupAuctionScheduler();

  console.log(
    "🚀 Background jobs started."
  );

  console.log(
    "📱 WhatsApp worker started."
  );
}