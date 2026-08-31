import "dotenv/config";

// ==========================================
// CONFIGURATION
// ==========================================

const WHATSAPP_ENABLED =
  process.env.WHATSAPP_ENABLED === "true";

const API_VERSION =
  process.env.WHATSAPP_API_VERSION || "v23.0";

const PHONE_NUMBER_ID =
  process.env.WHATSAPP_PHONE_NUMBER_ID;

const ACCESS_TOKEN =
  process.env.WHATSAPP_ACCESS_TOKEN;

const DEFAULT_TEMPLATE_NAME =
  process.env.WHATSAPP_TEMPLATE_NAME ||
  "spice_market_daily_update";

const DEFAULT_TEMPLATE_LANGUAGE =
  process.env.WHATSAPP_TEMPLATE_LANGUAGE ||
  "en";

// ==========================================
// TYPES
// ==========================================

export interface WhatsAppTemplateParameter {
  type: "text";
  text: string;
}

export interface SendWhatsAppTemplateOptions {
  templateName?: string;
  templateLanguage?: string;
}

// ==========================================
// SEND WHATSAPP TEMPLATE
// ==========================================

export async function sendWhatsAppTemplate(
  phoneNumber: string,
  parameters: WhatsAppTemplateParameter[] = [],
  options: SendWhatsAppTemplateOptions = {}
) {
  // ==========================================
  // DISABLED / TEST MODE
  // ==========================================

  if (!WHATSAPP_ENABLED) {
    console.log("");
    console.log("🧪 WhatsApp is disabled.");

    return {
      success: true,
      testMode: true,
      data: null,
    };
  }

  // ==========================================
  // VALIDATE CONFIGURATION
  // ==========================================

  if (!PHONE_NUMBER_ID) {
    throw new Error(
      "WHATSAPP_PHONE_NUMBER_ID is missing from .env"
    );
  }

  if (!ACCESS_TOKEN) {
    throw new Error(
      "WHATSAPP_ACCESS_TOKEN is missing from .env"
    );
  }

  // ==========================================
  // TEMPLATE CONFIGURATION
  // ==========================================

  const templateName =
    options.templateName ||
    DEFAULT_TEMPLATE_NAME;

  const templateLanguage =
    options.templateLanguage ||
    DEFAULT_TEMPLATE_LANGUAGE;

  // ==========================================
  // VALIDATE TEMPLATE PARAMETERS
  // ==========================================

  if (
    templateName ===
    "spice_market_daily_update"
  ) {
    if (parameters.length !== 3) {
      throw new Error(
        `WhatsApp template "${templateName}" requires exactly 3 body parameters, but ${parameters.length} were provided.`
      );
    }
  }

  // ==========================================
  // PHONE
  // ==========================================

  const normalizedPhone =
    normalizePhoneNumber(phoneNumber);

  if (!normalizedPhone) {
    throw new Error(
      "Invalid WhatsApp phone number."
    );
  }

  // ==========================================
  // META GRAPH API URL
  // ==========================================

  const url =
    `https://graph.facebook.com/${API_VERSION}/` +
    `${PHONE_NUMBER_ID}/messages`;

  // ==========================================
  // TEMPLATE
  // ==========================================

  const template: Record<string, unknown> = {
    name: templateName,

    language: {
      code: templateLanguage,
    },

    components: [
      {
        type: "body",

        parameters,
      },
    ],
  };

  // ==========================================
  // LOG
  // ==========================================

  console.log("");
  console.log(
    "📱 Sending WhatsApp message..."
  );

  console.log(
    `📞 Recipient: ${normalizedPhone}`
  );

  console.log(
    `📝 Template: ${templateName}`
  );

  console.log(
    `🌐 Language: ${templateLanguage}`
  );

  console.log(
    `📦 Parameters: ${parameters.length}`
  );

  // ==========================================
  // DEBUG PARAMETERS
  // ==========================================

  console.log("");

  parameters.forEach(
    (parameter, index) => {
      console.log(
        `   ${index + 1}. ${parameter.text}`
      );
    }
  );

  // ==========================================
  // REQUEST BODY
  // ==========================================

  const requestBody = {
    messaging_product: "whatsapp",

    to: normalizedPhone,

    type: "template",

    template,
  };

  // ==========================================
  // REQUEST
  // ==========================================

  let response: Response;

  try {
    response = await fetch(url, {
      method: "POST",

      headers: {
        Authorization:
          `Bearer ${ACCESS_TOKEN}`,

        "Content-Type":
          "application/json",
      },

      body: JSON.stringify(requestBody),
    });
  } catch (error) {
    console.error("");

    console.error(
      "❌ WhatsApp network request failed:"
    );

    console.error(error);

    throw error;
  }

  // ==========================================
  // RESPONSE
  // ==========================================

  let data: any;

  try {
    data = await response.json();
  } catch {
    data = null;
  }

  // ==========================================
  // ERROR
  // ==========================================

  if (!response.ok) {
    console.error("");

    console.error(
      "❌ WhatsApp API error:"
    );

    console.error(
      JSON.stringify(
        data,
        null,
        2
      )
    );

    throw new Error(
      `WhatsApp API returned HTTP ${response.status}`
    );
  }

  // ==========================================
  // SUCCESS
  // ==========================================

  const messageId =
    data?.messages?.[0]?.id ?? null;

  console.log("");

  console.log(
    "✅ WhatsApp API accepted message."
  );

  console.log(
    `🆔 Message ID: ${
      messageId ?? "unknown"
    }`
  );

  return {
    success: true,

    testMode: false,

    messageId,

    data,
  };
}

// ==========================================
// PHONE NORMALIZATION
// ==========================================

function normalizePhoneNumber(
  phoneNumber: string
): string {
  let phone =
    phoneNumber.replace(/\D/g, "");

  // ==========================================
  // INDIAN 10-DIGIT NUMBER
  // ==========================================
  //
  // 9562106384
  //
  // becomes:
  //
  // 919562106384
  //
  // ==========================================

  if (
    phone.length === 10 &&
    /^[6-9]/.test(phone)
  ) {
    phone = `91${phone}`;
  }

  return phone;
}