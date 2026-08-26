import { Queue } from "bullmq";

import { redisConnection } from "../config/redis.js";

export const whatsappQueue = new Queue(
  "whatsapp-notifications",
  {
    connection: redisConnection,
  }
);