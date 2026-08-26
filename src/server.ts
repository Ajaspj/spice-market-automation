import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import auctionRoutes from "./modules/auction/auction.routes.js";
import priceRoutes from "./modules/price/price.routes.js";
import { startJobs } from "./jobs/index.js";

dotenv.config();

const app = express();

const PORT = Number(process.env.PORT || 5000);

// ============================================
// MIDDLEWARE
// ============================================

app.use(cors());
app.use(express.json());

// ============================================
// HEALTH / ROOT
// ============================================

app.get("/", (_req, res) => {
  res.json({
    message: "Spice Market Automation API",
    status: "running",
  });
});

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "spice-market-automation",
  });
});

// ============================================
// API ROUTES
// ============================================

app.use("/api/auctions", auctionRoutes);

app.use("/api/prices", priceRoutes);

// ============================================
// START SERVER
// ============================================

async function startServer() {
  try {
    app.listen(PORT, () => {
      console.log("");
      console.log("==========================================");
      console.log("🌶️ SPICE MARKET AUTOMATION");
      console.log("==========================================");
      console.log(
        `🌐 API: http://localhost:${PORT}`
      );
      console.log(
        `❤️ Health: http://localhost:${PORT}/health`
      );
      console.log("==========================================");
    });

    await startJobs();

    console.log(
      "🚀 Automation engine is running."
    );
  } catch (error) {
    console.error(
      "❌ Failed to start application:",
      error
    );

    process.exit(1);
  }
}

startServer();