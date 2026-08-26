import axios from "axios";
import * as cheerio from "cheerio";

import {
  AuctionCollectionResult,
  RawAuctionRecord,
} from "./auction.types.js";

const SOURCE_URL =
  "https://www.indianspices.com/marketing/price/domestic/daily-price.html";

function parseNumber(value: string): number {
  const cleaned = value
    .replace(/,/g, "")
    .replace(/[^\d.-]/g, "")
    .trim();

  const number = Number(cleaned);

  return Number.isFinite(number) ? number : 0;
}

function normalizeDate(date: string): string {
  const cleaned = date.trim();

  const parts = cleaned.split("-");

  if (parts.length !== 3) {
    return cleaned;
  }

  const day = parts[0].padStart(2, "0");

  const months: Record<string, string> = {
    Jan: "01",
    Feb: "02",
    Mar: "03",
    Apr: "04",
    May: "05",
    Jun: "06",
    Jul: "07",
    Aug: "08",
    Sep: "09",
    Oct: "10",
    Nov: "11",
    Dec: "12",
  };

  const month = months[parts[1]];

  if (!month) {
    return cleaned;
  }

  return `${parts[2]}-${month}-${day}`;
}

function formatDateForSource(date: Date): string {
  const day = date.getDate().toString().padStart(2, "0");

  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  const month = months[date.getMonth()];
  const year = date.getFullYear();

  return `${day}-${month}-${year}`;
}

export async function collectTodayAuctions(
  targetDate: Date
): Promise<AuctionCollectionResult> {
  console.log("🌶️ Collecting official spice auction data...");

  const response = await axios.get(SOURCE_URL, {
    timeout: 30000,

    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/151 Safari/537.36",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
  });

  console.log(`🌐 HTTP Status: ${response.status}`);

  const $ = cheerio.load(response.data);

  const targetDateString = targetDate
    .toISOString()
    .slice(0, 10);

  const targetSourceDate = formatDateForSource(targetDate);

  console.log(`📅 Looking for auction date: ${targetSourceDate}`);

  const records: RawAuctionRecord[] = [];

  $("table tr").each((_index, row) => {
    const cells = $(row)
      .find("td")
      .map((_cellIndex, cell) => {
        return $(cell).text().trim();
      })
      .get();

    // Expected:
    //
    // 0 = Sno
    // 1 = Date
    // 2 = Auctioneer
    // 3 = Lots
    // 4 = Quantity Arrived
    // 5 = Quantity Sold
    // 6 = Maximum
    // 7 = Minimum
    // 8 = Average

    if (cells.length < 9) {
      return;
    }

    const rawDate = cells[1];

    if (rawDate !== targetSourceDate) {
      return;
    }

    const record: RawAuctionRecord = {
      date: normalizeDate(rawDate),

      auctioneer: cells[2],

      lots: parseNumber(cells[3]),

      quantityArrived: parseNumber(cells[4]),

      quantitySold: parseNumber(cells[5]),

      maximumPrice: parseNumber(cells[6]),

      minimumPrice: parseNumber(cells[7]),

      averagePrice: parseNumber(cells[8]),
    };

    records.push(record);
  });

  console.log(
    `📊 Found ${records.length} auction records for ${targetDateString}`
  );

  return {
    source: SOURCE_URL,
    auctionDate: targetDateString,
    completed: records.length > 0,
    records,
  };
}