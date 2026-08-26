export interface PriceComparison {
  spiceId: string;

  currentAverage: number;
  previousAverage: number | null;

  difference: number;
  percentageChange: number | null;

  direction: "UP" | "DOWN" | "UNCHANGED" | "NEW";
}