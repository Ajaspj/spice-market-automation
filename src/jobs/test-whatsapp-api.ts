import "dotenv/config";

import {
  sendWhatsAppTemplate,
  WhatsAppTemplateParameter,
} from "../modules/whatsapp/whatsapp.service.js";

async function main() {
  console.log("");
  console.log("================================");
  console.log("📱 WHATSAPP CLOUD API TEST");
  console.log("================================");

  const phone =
    process.env.TEST_WHATSAPP_NUMBER;

  if (!phone) {
    throw new Error(
      "TEST_WHATSAPP_NUMBER is missing from .env"
    );
  }

  console.log(
    `📞 Test recipient: ${phone}`
  );

  // ==========================================
  // TEMPLATE PARAMETERS
  // ==========================================

  const parameters: WhatsAppTemplateParameter[] = [
    {
      type: "text",
      text: "Test Farmer",
    },

    {
      type: "text",
      text: "24 August 2026",
    },

    {
      type: "text",
      text:
        "Cardamom - Header Systems: Lowest ₹2298.00/kg, Highest ₹3607.00/kg, Average ₹2996.19/kg; Mas Enterprises: Lowest ₹2058.00/kg, Highest ₹4095.00/kg, Average ₹3067.97/kg",
    },
  ];

  console.log("");
  console.log("📦 Template parameters:");

  console.dir(parameters, {
    depth: null,
  });

  // ==========================================
  // SEND
  // ==========================================

  const result =
    await sendWhatsAppTemplate(
      phone,
      parameters
    );

  console.log("");
  console.log("================================");
  console.log("📊 RESULT");
  console.log("================================");

  console.dir(result, {
    depth: null,
  });
}

main().catch((error) => {
  console.error("");
  console.error(
    "❌ WhatsApp API test failed:"
  );

  console.error(error);

  process.exit(1);
});