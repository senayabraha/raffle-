import { supabase } from "./supabase";

export type PaymentProvider = "chapa" | "telebirr";

export interface StartCheckoutInput {
  raffleId: string;
  raffleSlug: string;
  qty: number;
  provider: PaymentProvider;
  fullName: string;
  phone: string;
  email: string;
  city: string;
  /** ISO date string (YYYY-MM-DD). Entrant must be 18+. */
  dateOfBirth: string;
}

export interface StartCheckoutResult {
  paymentId: string;
  checkoutUrl: string;
}

/** Creates a pending payment and starts a hosted checkout session with the chosen provider. */
export async function startCheckout(
  input: StartCheckoutInput,
): Promise<StartCheckoutResult> {
  const { data, error } = await supabase.functions.invoke("create-checkout", {
    body: input,
  });
  if (error) throw new Error(error.message || "Could not start checkout.");
  if (data?.error) throw new Error(data.error as string);
  return data as StartCheckoutResult;
}

export interface CheckoutStatus {
  payment_id: string;
  status: "pending" | "held" | "released" | "refunded" | "compensated" | "failed";
  amount: number;
  provider: PaymentProvider | null;
  raffle_title: string;
  raffle_slug: string;
  draw_date: string | null;
  paid: number;
  free: number;
  ticket_numbers: number[];
}

/** Looks up a checkout's current status by payment id (the id itself is the access token). */
export async function getCheckoutStatus(paymentId: string): Promise<CheckoutStatus> {
  const { data, error } = await supabase.rpc("get_checkout_status", {
    p_payment_id: paymentId,
  });
  if (error) throw new Error(error.message);
  return data as unknown as CheckoutStatus;
}
