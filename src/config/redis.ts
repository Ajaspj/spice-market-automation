import { Redis } from "ioredis";

export const redisConnection = new Redis({
  host: process.env.REDIS_HOST || "localhost",
  port: Number(process.env.REDIS_PORT || 6380),
  maxRetriesPerRequest: null,
});