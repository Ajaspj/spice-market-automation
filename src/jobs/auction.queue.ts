import { Queue } from "bullmq";

import { redisConnection } from "../config/redis.js";

export const auctionQueue =
  new Queue("spice-auction", {
    connection: redisConnection,
  });