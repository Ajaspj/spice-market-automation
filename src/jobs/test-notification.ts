import "dotenv/config";

import { prisma } from "../config/database.js";

import {
  createNotificationsForAuction,
} from "../modules/notification/notification.service.js";

async function main() {
  console.log("");
  console.log("================================");
  console.log("📱 NOTIFICATION TEST");
  console.log("================================");

  const auction = await prisma.auction.findFirst({
    where: {
      status: "COMPLETED",
    },
    orderBy: {
      auctionDate: "desc",
    },
  });

  if (!auction) {
    console.log("❌ No completed auction found.");
    return;
  }

  console.log(
    `🏪 Testing auction: ${auction.id}`
  );

  const result =
    await createNotificationsForAuction(
      auction.id
    );

  console.log("");
  console.log("📊 Result:");
  console.log(result);
}

main()
  .catch((error) => {
    console.error("");
    console.error("❌ Test failed:");
    console.error(error);

    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });