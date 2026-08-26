export interface RawAuctionRecord {
  date: string;
  auctioneer: string;
  lots: number;
  quantityArrived: number;
  quantitySold: number;
  maximumPrice: number;
  minimumPrice: number;
  averagePrice: number;
}

export interface AuctionCollectionResult {
  source: string;
  auctionDate: string;
  completed: boolean;
  records: RawAuctionRecord[];
}