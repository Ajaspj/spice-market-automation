import { Router, Request, Response } from "express";

const router = Router();

const VERIFY_TOKEN =
  process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN ||
  "spice-market-webhook-token";

// ==========================================
// META WEBHOOK VERIFICATION
// ==========================================

router.get("/", (req: Request, res: Response) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  console.log("");
  console.log("================================");
  console.log("📱 WHATSAPP WEBHOOK VERIFICATION");
  console.log("================================");

  if (
    mode === "subscribe" &&
    token === VERIFY_TOKEN
  ) {
    console.log("✅ Webhook verification successful.");

    res.status(200).send(challenge);
    return;
  }

  console.error("❌ Webhook verification failed.");

  res.sendStatus(403);
});

// ==========================================
// META WEBHOOK EVENTS
// ==========================================

router.post("/", (req: Request, res: Response) => {
  console.log("");
  console.log("================================");
  console.log("📱 WHATSAPP WEBHOOK EVENT");
  console.log("================================");

  console.log(
    JSON.stringify(req.body, null, 2)
  );

  // IMPORTANT:
  // Respond immediately to Meta.
  res.sendStatus(200);

  processWhatsAppWebhook(req.body).catch(
    (error) => {
      console.error(
        "❌ Webhook processing failed:"
      );

      console.error(error);
    }
  );
});

// ==========================================
// PROCESS EVENT
// ==========================================

async function processWhatsAppWebhook(
  body: any
) {
  if (body?.object !== "whatsapp_business_account") {
    console.log(
      "⏭️ Ignoring non-WhatsApp webhook."
    );

    return;
  }

  const entries = body.entry ?? [];

  for (const entry of entries) {
    const changes = entry.changes ?? [];

    for (const change of changes) {
      const value = change.value;

      // ======================================
      // MESSAGE STATUS
      // ======================================

      const statuses =
        value?.statuses ?? [];

      for (const status of statuses) {
        console.log("");
        console.log(
          "📊 WHATSAPP MESSAGE STATUS"
        );
        console.log(
          "--------------------------------"
        );

        console.log(
          `🆔 Message ID: ${status.id}`
        );

        console.log(
          `📞 Recipient: ${status.recipient_id}`
        );

        console.log(
          `📊 Status: ${status.status}`
        );

        if (status.timestamp) {
          console.log(
            `⏰ Timestamp: ${status.timestamp}`
          );
        }

        if (status.errors) {
          console.error(
            "❌ WhatsApp delivery error:"
          );

          console.error(
            JSON.stringify(
              status.errors,
              null,
              2
            )
          );
        }

        console.log(
          "--------------------------------"
        );
      }

      // ======================================
      // INCOMING MESSAGE
      // ======================================

      const messages =
        value?.messages ?? [];

      for (const message of messages) {
        console.log("");
        console.log(
          "📩 INCOMING WHATSAPP MESSAGE"
        );

        console.log(
          `🆔 Message ID: ${message.id}`
        );

        console.log(
          `📞 From: ${message.from}`
        );

        console.log(
          `📦 Type: ${message.type}`
        );
      }
    }
  }
}

export default router;