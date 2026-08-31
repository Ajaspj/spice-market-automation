import { PrismaClient } from "../src/generated/prisma/client.js";

const prisma = new PrismaClient();

async function main() {
  console.log("🌶️ Starting Spice Market seed...");

  // ============================================
  // SPICES
  // ============================================

  const spices = [
    {
      name: "Cardamom",
      slug: "cardamom",
      unit: "kg",
    },
    {
      name: "Black Pepper",
      slug: "black-pepper",
      unit: "kg",
    },
    {
      name: "Clove",
      slug: "clove",
      unit: "kg",
    },
    {
      name: "Cinnamon",
      slug: "cinnamon",
      unit: "kg",
    },
    {
      name: "Nutmeg",
      slug: "nutmeg",
      unit: "kg",
    },
    {
      name: "Mace",
      slug: "mace",
      unit: "kg",
    },
    {
      name: "Ginger",
      slug: "ginger",
      unit: "kg",
    },
    {
      name: "Turmeric",
      slug: "turmeric",
      unit: "kg",
    },
  ];

  for (const spice of spices) {
    await prisma.spice.upsert({
      where: {
        slug: spice.slug,
      },

      update: {
        name: spice.name,
        unit: spice.unit,
      },

      create: {
        name: spice.name,
        slug: spice.slug,
        unit: spice.unit,
      },
    });
  }

  console.log(
    `✅ ${spices.length} spices inserted/updated`
  );

  // ============================================
  // MARKETS
  // ============================================

  const markets = [
    {
      name: "Puttady",
      location: "Idukki, Kerala",
    },
    {
      name: "Nedumkandam",
      location: "Idukki, Kerala",
    },
  ];

  for (const market of markets) {
    const existingMarket =
      await prisma.market.findFirst({
        where: {
          name: market.name,
        },
      });

    if (existingMarket) {
      await prisma.market.update({
        where: {
          id: existingMarket.id,
        },

        data: {
          location: market.location,
        },
      });
    } else {
      await prisma.market.create({
        data: {
          name: market.name,
          location: market.location,
        },
      });
    }
  }

  console.log(
    `✅ ${markets.length} markets inserted/updated`
  );

  // ============================================
  // FIND CARDAMOM
  // ============================================

  const cardamom =
    await prisma.spice.findUnique({
      where: {
        slug: "cardamom",
      },
    });

  if (!cardamom) {
    throw new Error(
      "Cardamom was not found after spice seeding."
    );
  }

  console.log(
    `🌱 Cardamom ID: ${cardamom.id}`
  );

  // ============================================
  // TEST FARMER
  // ============================================

  const TEST_FARMER_NAME = "Test Farmer";
  const TEST_FARMER_PHONE = "919562106384";

  /*
   * First look for the existing Test Farmer.
   *
   * This avoids the unique phoneNumber conflict
   * when an older seed created the farmer with
   * a different phone number.
   */

  const existingFarmer =
    await prisma.farmer.findFirst({
      where: {
        name: TEST_FARMER_NAME,
      },
    });

  let farmer;

  if (existingFarmer) {
    console.log(
      `♻️ Existing Test Farmer found: ${existingFarmer.id}`
    );

    /*
     * If another farmer already owns the desired
     * WhatsApp number, remove that duplicate only
     * if it is not the same farmer.
     */

    const farmerWithDesiredPhone =
      await prisma.farmer.findUnique({
        where: {
          phoneNumber: TEST_FARMER_PHONE,
        },
      });

    if (
      farmerWithDesiredPhone &&
      farmerWithDesiredPhone.id !== existingFarmer.id
    ) {
      console.log(
        `⚠️ Phone ${TEST_FARMER_PHONE} already belongs to another farmer.`
      );

      /*
       * Delete the old farmer's subscriptions first.
       */

      await prisma.farmerSpice.deleteMany({
        where: {
          farmerId: farmerWithDesiredPhone.id,
        },
      });

      /*
       * Delete the old farmer's notifications.
       *
       * Notification has onDelete: Cascade,
       * but explicitly removing them here makes
       * the seed behavior clear.
       */

      await prisma.notification.deleteMany({
        where: {
          farmerId: farmerWithDesiredPhone.id,
        },
      });

      await prisma.farmer.delete({
        where: {
          id: farmerWithDesiredPhone.id,
        },
      });

      console.log(
        `🗑️ Removed duplicate farmer: ${farmerWithDesiredPhone.id}`
      );
    }

    farmer = await prisma.farmer.update({
      where: {
        id: existingFarmer.id,
      },

      data: {
        name: TEST_FARMER_NAME,
        phoneNumber: TEST_FARMER_PHONE,
        whatsappEnabled: true,
      },
    });

    console.log(
      `✅ Test Farmer updated: ${farmer.id}`
    );
  } else {
    /*
     * No Test Farmer exists.
     *
     * Check whether the phone number is already
     * occupied by another farmer.
     */

    const farmerWithDesiredPhone =
      await prisma.farmer.findUnique({
        where: {
          phoneNumber: TEST_FARMER_PHONE,
        },
      });

    if (farmerWithDesiredPhone) {
      farmer = await prisma.farmer.update({
        where: {
          id: farmerWithDesiredPhone.id,
        },

        data: {
          name: TEST_FARMER_NAME,
          whatsappEnabled: true,
        },
      });

      console.log(
        `♻️ Existing farmer converted to Test Farmer: ${farmer.id}`
      );
    } else {
      farmer = await prisma.farmer.create({
        data: {
          name: TEST_FARMER_NAME,
          phoneNumber: TEST_FARMER_PHONE,
          whatsappEnabled: true,
        },
      });

      console.log(
        `👨‍🌾 Test Farmer created: ${farmer.id}`
      );
    }
  }

  // ============================================
  // FARMER → CARDAMOM
  // ============================================

  await prisma.farmerSpice.upsert({
    where: {
      farmerId_spiceId: {
        farmerId: farmer.id,
        spiceId: cardamom.id,
      },
    },

    update: {},

    create: {
      farmerId: farmer.id,
      spiceId: cardamom.id,
    },
  });

  console.log(
    "✅ Test Farmer subscribed to Cardamom"
  );

  // ============================================
  // FINAL VERIFICATION
  // ============================================

  const farmerWithSpices =
    await prisma.farmer.findUnique({
      where: {
        id: farmer.id,
      },

      include: {
        spices: {
          include: {
            spice: true,
          },
        },
      },
    });

  console.log("");

  console.log(
    "================================"
  );

  console.log(
    "👨‍🌾 TEST FARMER"
  );

  console.log(
    "================================"
  );

  console.log(
    `Name: ${farmerWithSpices?.name}`
  );

  console.log(
    `Phone: ${farmerWithSpices?.phoneNumber}`
  );

  console.log(
    `WhatsApp: ${
      farmerWithSpices?.whatsappEnabled
        ? "ENABLED"
        : "DISABLED"
    }`
  );

  console.log(
    `Spices: ${
      farmerWithSpices?.spices
        .map(
          (item) => item.spice.name
        )
        .join(", ") || "None"
    }`
  );

  // ============================================
  // COMPLETED
  // ============================================

  console.log("");

  console.log(
    "================================"
  );

  console.log(
    "🌶️ SEED COMPLETED SUCCESSFULLY"
  );

  console.log(
    "================================"
  );
}

// ============================================
// RUN SEED
// ============================================

main()
  .catch((error) => {
    console.error("");
    console.error("❌ Seed failed:");
    console.error(error);

    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });