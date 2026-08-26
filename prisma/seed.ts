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
      create: spice,
    });
  }

  console.log(`✅ ${spices.length} spices inserted/updated`);

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
    const existingMarket = await prisma.market.findFirst({
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
        data: market,
      });
    }
  }

  console.log(`✅ ${markets.length} markets inserted/updated`);

  console.log("");
  console.log("================================");
  console.log("🌶️ SEED COMPLETED SUCCESSFULLY");
  console.log("================================");
}



// ============================================
// TEST FARMER
// ============================================

const cardamom = await prisma.spice.findUnique({
  where: {
    slug: "cardamom",
  },
});

if (!cardamom) {
  throw new Error(
    "Cardamom was not found."
  );
}

const farmer =
  await prisma.farmer.upsert({
    where: {
      phoneNumber: "9999999999",
    },

    update: {
      name: "Test Farmer",
      whatsappEnabled: true,
    },

    create: {
      name: "Test Farmer",
      phoneNumber: "9999999999",
      whatsappEnabled: true,
    },
  });

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
  "👨‍🌾 Test farmer configured for Cardamom"
);
main()
  .catch((error) => {
    console.error("❌ Seed failed:");
    console.error(error);

    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });