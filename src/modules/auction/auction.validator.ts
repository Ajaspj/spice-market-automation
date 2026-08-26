import { RawAuctionRecord } from "./auction.types.js";

export function validateAuctionRecord(
  record: RawAuctionRecord
): boolean {
  if (!record.date) {
    return false;
  }

  if (!record.auctioneer) {
    return false;
  }

  if (record.lots <= 0) {
    return false;
  }

  if (record.quantityArrived <= 0) {
    return false;
  }

  if (record.quantitySold < 0) {
    return false;
  }

  if (record.quantitySold > record.quantityArrived) {
    return false;
  }

  if (record.maximumPrice <= 0) {
    return false;
  }

  if (record.minimumPrice <= 0) {
    return false;
  }

  if (record.averagePrice <= 0) {
    return false;
  }

  if (record.minimumPrice > record.maximumPrice) {
    return false;
  }

  if (
    record.averagePrice < record.minimumPrice ||
    record.averagePrice > record.maximumPrice
  ) {
    return false;
  }

  return true;
}