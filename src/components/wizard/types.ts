export type PrizeCondition = "new" | "used" | "refurbished";
export type DeliveryMethod = "shipping" | "pickup" | "digital" | "cash_equivalent";

export interface RaffleDraft {
  // 1 · Prize details
  title: string;
  description: string;
  category: string;
  prizeValue: number | null;
  condition: PrizeCondition;
  deliveryMethod: DeliveryMethod;
  // 2 · Revenue planner
  plannerPrizeValue: number | null;
  plannerProfitTargetPct: number;
  plannerProfitTargetEtb: number;
  plannerTicketPrice: number;
  plannerTicketCap: number;
  // 3 · Ticket settings
  ticketPrice: number;
  unlimited: boolean;
  ticketCap: number;
  bundlesEnabled: boolean;
  bundleQty: number;
  bundleFree: number;
  // 3 · Draw settings
  drawType: "date" | "soldout";
  drawDate: string;
  minTicketTarget: number;
  // 6 · Visibility
  visibility: "public" | "private";
}

export const initialDraft: RaffleDraft = {
  title: "",
  description: "",
  category: "Automotive",
  prizeValue: null,
  condition: "new",
  deliveryMethod: "shipping",
  plannerPrizeValue: null,
  plannerProfitTargetPct: 0,
  plannerProfitTargetEtb: 0,
  plannerTicketPrice: 0,
  plannerTicketCap: 0,
  ticketPrice: 5,
  unlimited: false,
  ticketCap: 10000,
  bundlesEnabled: true,
  bundleQty: 5,
  bundleFree: 1,
  drawType: "date",
  drawDate: "",
  minTicketTarget: 1000,
  visibility: "public",
};
