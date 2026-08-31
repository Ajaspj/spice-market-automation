import { Worker } from "bullmq";

import { redisConnection } from "../config/redis.js";
import { prisma } from "../config/database.js";

import {
  sendWhatsAppTemplate,
} from "../modules/whatsapp/whatsapp.service.js";

export const whatsappWorker = new Worker(
  "whatsapp-notifications",

  async (job) => {
    const { notificationId } = job.data;

    console.log("");
    console.log("================================");
    console.log("📱 WHATSAPP WORKER");
    console.log("================================");

    console.log(
      `🆔 Job: ${job.id}`
    );

    console.log(
      `🆔 Notification: ${notificationId}`
    );

    console.log(
      `🔄 Attempt: ${
        job.attemptsMade + 1
      }/${job.opts.attempts ?? 1}`
    );

    // ==========================================
    // FIND NOTIFICATION
    // ==========================================

    const notification =
      await prisma.notification.findUnique({
        where: {
          id: notificationId,
        },

        include: {
          farmer: true,
        },
      });

    if (!notification) {
      throw new Error(
        `Notification ${notificationId} not found.`
      );
    }

    // ==========================================
    // ALREADY SENT
    // ==========================================

    if (notification.status === "SENT") {
      console.log(
        "⏭️ Notification already sent."
      );

      return {
        sent: true,
        skipped: true,
        reason: "already-sent",
      };
    }

    // ==========================================
    // WHATSAPP DISABLED
    // ==========================================

    if (
      !notification.farmer.whatsappEnabled
    ) {
      console.log(
        "🚫 Farmer has disabled WhatsApp."
      );

      await prisma.notification.update({
        where: {
          id: notification.id,
        },

        data: {
          status: "CANCELLED",
        },
      });

      return {
        sent: false,
        skipped: true,
        reason: "whatsapp-disabled",
      };
    }

    // ==========================================
    // FARMER INFORMATION
    // ==========================================

    const farmerName =
      notification.farmer.name;

    const phoneNumber =
      notification.farmer.phoneNumber;

    console.log(
      `👨‍🌾 Farmer: ${farmerName}`
    );

    console.log(
      `📞 Phone: ${phoneNumber}`
    );

    // ==========================================
    // MESSAGE PREVIEW
    // ==========================================

    console.log("");
    console.log("MESSAGE PREVIEW:");
    console.log("--------------------------------");

    console.log(
      notification.message
    );

    console.log("--------------------------------");

    // ==========================================
    // TEMPLATE PARAMETERS
    // ==========================================
    //
    // WhatsApp template:
    //
    // {{1}} = Farmer name
    // {{2}} = Date
    // {{3}} = Price summary
    //
    // IMPORTANT:
    // Meta does not allow newline characters
    // inside a text template parameter.
    //
    // Therefore we convert the notification
    // message into one single-line summary.
    // ==========================================

    const notificationDate =
      formatNotificationDate(
        notification.notificationDate
      );

    const priceSummary =
      createWhatsAppPriceSummary(
        notification.message
      );

    const parameters = [
      {
        type: "text" as const,
        text: farmerName,
      },

      {
        type: "text" as const,
        text: notificationDate,
      },

      {
        type: "text" as const,
        text: priceSummary,
      },
    ];

    // ==========================================
    // LOG PARAMETERS
    // ==========================================

    console.log("");
    console.log(
      "📦 WhatsApp template parameters:"
    );

    console.log(
      JSON.stringify(
        parameters,
        null,
        2
      )
    );

    // ==========================================
    // SEND WHATSAPP
    // ==========================================

    try {
      const result =
        await sendWhatsAppTemplate(
          phoneNumber,
          parameters
        );

      // ========================================
      // SUCCESS
      // ========================================

      if (result.success) {
        await prisma.notification.update({
          where: {
            id: notification.id,
          },

          data: {
            status: "SENT",
            sentAt: new Date(),
          },
        });

        console.log("");
        console.log(
          "✅ WhatsApp message sent successfully."
        );

        console.log(
          `🆔 Message ID: ${
            result.messageId ??
            result.data?.messages?.[0]?.id ??
            "unknown"
          }`
        );

        return {
          sent: true,

          testMode:
            result.testMode,

          messageId:
            result.messageId ??
            result.data?.messages?.[0]?.id ??
            null,
        };
      }

      throw new Error(
        "WhatsApp service returned unsuccessful result."
      );
    } catch (error) {
      console.error("");

      console.error(
        "❌ WhatsApp delivery failed:"
      );

      console.error(error);

      // ========================================
      // RETRY CALCULATION
      // ========================================

      const attemptsMade =
        job.attemptsMade;

      const maxAttempts =
        job.opts.attempts ?? 1;

      const currentAttempt =
        attemptsMade + 1;

      const finalAttempt =
        currentAttempt >= maxAttempts;

      // ========================================
      // FINAL FAILURE
      // ========================================

      if (finalAttempt) {
        console.error("");

        console.error(
          "❌ Maximum WhatsApp retry attempts reached."
        );

        console.error(
          `❌ Attempts: ${currentAttempt}/${maxAttempts}`
        );

        await prisma.notification.update({
          where: {
            id: notification.id,
          },

          data: {
            status: "FAILED",
          },
        });

        console.error(
          "❌ Notification marked as FAILED."
        );
      }

      // ========================================
      // RETRY
      // ========================================

      else {
        console.log("");

        console.log(
          "🔄 WhatsApp retry scheduled."
        );

        console.log(
          `🔄 Attempt ${currentAttempt}/${maxAttempts} failed.`
        );

        await prisma.notification.update({
          where: {
            id: notification.id,
          },

          data: {
            status: "PENDING",
          },
        });
      }

      // IMPORTANT:
      // Throw the error so BullMQ performs
      // the retry automatically.
      throw error;
    }
  },

  {
    connection: redisConnection,

    concurrency: 1,

    limiter: {
      max: 10,
      duration: 1000,
    },
  }
);

// ==========================================
// FORMAT DATE
// ==========================================

function formatNotificationDate(
  date: Date
): string {
  return date.toLocaleDateString(
    "en-GB",
    {
      day: "2-digit",
      month: "long",
      year: "numeric",

      timeZone:
        "Asia/Kolkata",
    }
  );
}

// ==========================================
// CREATE WHATSAPP PRICE SUMMARY
// ==========================================

function createWhatsAppPriceSummary(
  message: string
): string {
  // ------------------------------------------
  // Remove decorative/header lines
  // ------------------------------------------

  let summary =
    message
      .replace(
        /🌶️\s*SPICE MARKET DAILY UPDATE/gi,
        ""
      )
      .replace(
        /Hello .*?👋/gi,
        ""
      )
      .replace(
        /📅.*$/gm,
        ""
      )
      .replace(
        /🌾 Spice Market Automation/gi,
        ""
      );

  // ------------------------------------------
  // Convert newlines to spaces
  // ------------------------------------------

  summary =
    summary.replace(
      /[\r\n\t]+/g,
      " "
    );

  // ------------------------------------------
  // Normalize spaces
  // ------------------------------------------

  summary =
    summary.replace(
      /\s+/g,
      " "
    );

  summary =
    summary.trim();

  // ------------------------------------------
  // Remove excessive punctuation
  // ------------------------------------------

  summary =
    summary.replace(
      /\s*;\s*/g,
      "; "
    );

  // ------------------------------------------
  // Meta restriction:
  // no newline/tab
  // no >4 consecutive spaces
  // ------------------------------------------

  summary =
    summary
      .replace(/[\r\n\t]/g, " ")
      .replace(/ {5,}/g, " ")
      .trim();

  // ------------------------------------------
  // Fallback
  // ------------------------------------------

  if (!summary) {
    summary =
      "Today's Cardamom auction prices are available.";
  }

  return summary;
}

// ==========================================
// WORKER EVENTS
// ==========================================

whatsappWorker.on(
  "completed",
  (job) => {
    console.log("");

    console.log(
      `✅ WhatsApp job ${job.id} completed`
    );
  }
);

whatsappWorker.on(
  "failed",
  (job, error) => {
    console.error("");

    console.error(
      `❌ WhatsApp job ${job?.id} failed`
    );

    console.error(
      `❌ Reason: ${error.message}`
    );
  }
);

whatsappWorker.on(
  "error",
  (error) => {
    console.error("");

    console.error(
      "❌ WhatsApp worker error:"
    );

    console.error(error);
  }
);

console.log(
  "📱 WhatsApp worker started."
);