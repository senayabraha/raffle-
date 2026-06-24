export interface RaffleDraft {
  // 1 · Prize details
  title: string;
  description: string;
  category: string;
  // 2 · Ticket settings
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
