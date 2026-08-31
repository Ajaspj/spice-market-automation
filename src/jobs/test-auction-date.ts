import "dotenv/config";
import { collectAndSaveTodayAuctions } from "../modules/auction/auction.service.js";

async function main() {
  console.log("");
  console.log("================================");
  console.log("🌶️ HISTORICAL AUCTION TEST");
  console.log("================================");

  const testDate = new Date(
    "2026-08-29T12:00:00+05:30"
  );

  console.log(
    `📅 Testing auction date: ${testDate.toISOString()}`
  );

  const result =
    await collectAndSaveTodayAuctions(testDate);

  console.log("");
  console.log("================================");
  console.log("📊 RESULT");
  console.log("================================");

  console.dir(result, {
    depth: null,
  });
}

main()
  .catch((error) => {
    console.error("");
    console.error("❌ Historical auction test failed:");
    console.error(error);

    process.exit(1);
  });