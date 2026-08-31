import axios from "axios";
import * as cheerio from "cheerio";
import { Agent } from "node:https";

const SOURCE_URL =
  "https://www.indianspices.com/marketing/price/domestic/daily-price.html";

const httpsAgent = new Agent({
  family: 4,
  keepAlive: true,
});

const REQUEST_TIMEOUT = 60_000;
const MAX_RETRIES = 3;

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
  /*
   * The Spice Board publishes dates in:
   *
   * DD-MMM-YYYY
   *
   * We intentionally use the Asia/Kolkata calendar date
   * instead of relying on the machine/container timezone.
   */

  const indiaDate = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).formatToParts(date);

  const day =
    indiaDate.find((part) => part.type === "day")?.value ?? "";

  const month =
    indiaDate.find((part) => part.type === "month")?.value ?? "";

  const year =
    indiaDate.find((part) => part.type === "year")?.value ?? "";

  return `${day}-${month}-${year}`;
}

async function fetchAuctionPage() {
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(
        `🌐 Fetching Spice Board page (attempt ${attempt}/${MAX_RETRIES})...`
      );

      const response = await axios.get(SOURCE_URL, {
        timeout: REQUEST_TIMEOUT,

        httpsAgent,

        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/151 Safari/537.36",

          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",

          "Accept-Language":
            "en-IN,en;q=0.9",

          Connection: "keep-alive",
        },

        validateStatus: (status) =>
          status >= 200 && status < 300,
      });

      return response;
    } catch (error) {
      lastError = error;

      if (axios.isAxiosError(error)) {
        console.error(
          `❌ Spice Board request failed: ${error.code ?? "UNKNOWN"}`
        );

        console.error(
          `   ${error.message}`
        );
      } else {
        console.error(
          "❌ Unexpected Spice Board request error:"
        );

        console.error(error);
      }

      if (attempt < MAX_RETRIES) {
        const delay = attempt * 5000;

        console.log(
          `⏳ Retrying in ${delay / 1000} seconds...`
        );

        await new Promise((resolve) =>
          setTimeout(resolve, delay)
        );
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error(
        "Unable to fetch Spice Board auction page."
      );
}

export async function collectTodayAuctions(
  targetDate: Date
) {
  console.log(
    "🌶️ Collecting official spice auction data..."
  );

  const response = await fetchAuctionPage();

  console.log(
    `🌐 HTTP Status: ${response.status}`
  );

  const $ = cheerio.load(response.data);

  /*
   * Use India's calendar date.
   */
  const indiaDateString = new Intl.DateTimeFormat(
    "en-CA",
    {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }
  ).format(targetDate);

  const targetSourceDate =
    formatDateForSource(targetDate);

  console.log(
    `📅 Looking for auction date: ${targetSourceDate}`
  );

  const records: Array<{
    date: string;
    auctioneer: string;
    lots: number;
    quantityArrived: number;
    quantitySold: number;
    maximumPrice: number;
    minimumPrice: number;
    averagePrice: number;
  }> = [];

  $("table tr").each((_index, row) => {
    const cells = $(row)
      .find("td")
      .map((_cellIndex, cell) => {
        return $(cell)
          .text()
          .replace(/\s+/g, " ")
          .trim();
      })
      .get();

    /*
     * Expected Spice Board columns:
     *
     * 0 = Sno
     * 1 = Date
     * 2 = Auctioneer
     * 3 = Lots
     * 4 = Quantity Arrived
     * 5 = Quantity Sold
     * 6 = Maximum
     * 7 = Minimum
     * 8 = Average
     */

    if (cells.length < 9) {
      return;
    }

    const rawDate = cells[1];

    if (rawDate !== targetSourceDate) {
      return;
    }

    const auctioneer = cells[2];

    if (!auctioneer) {
      return;
    }

    const record = {
      date: normalizeDate(rawDate),

      auctioneer,

      lots: parseNumber(cells[3]),

      quantityArrived: parseNumber(
        cells[4]
      ),

      quantitySold: parseNumber(
        cells[5]
      ),

      maximumPrice: parseNumber(
        cells[6]
      ),

      minimumPrice: parseNumber(
        cells[7]
      ),

      averagePrice: parseNumber(
        cells[8]
      ),
    };

    records.push(record);

    console.log(
      `🏪 ${record.auctioneer} | Min ₹${record.minimumPrice} | Max ₹${record.maximumPrice} | Avg ₹${record.averagePrice}`
    );
  });

  console.log(
    `📊 Found ${records.length} auction records for ${indiaDateString}`
  );

  return {
    source: SOURCE_URL,

    auctionDate: indiaDateString,

    completed: records.length > 0,

    records,
  };
}