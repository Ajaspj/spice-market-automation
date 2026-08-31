import { Queue } from "bullmq";

import { redisConnection } from "../config/redis.js";

export const whatsappQueue = new Queue(
  "whatsapp-notifications",
  {
    connection: redisConnection,

    defaultJobOptions: {
      attempts: 5,

      backoff: {
        type: "exponential",
        delay: 5000,
      },

      removeOnComplete: 100,

      removeOnFail: 500,
    },
  }
);