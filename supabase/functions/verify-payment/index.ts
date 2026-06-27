// Webhook receiver for Chapa payment callbacks. Verifies the Chapa
// signature header (HMAC-SHA256 with the webhook secret), then re-verifies
// the transaction directly with Chapa (never trusts the webhook body
// alone), finalizes the checkout (allocates tickets), and emails a receipt.
import { createClient } from "jsr:@supabase/supabase-js@2";

const encoder = new TextEncoder();

/** Lowercase hex HMAC-SHA256 of `message` keyed by `secret`. */
async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Constant-time comparison to avoid leaking the signature via timing. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  // Read the raw body first so the HMAC is computed over the exact bytes
  // Chapa signed, before any JSON re-serialization.
  const rawBody = await req.text();

  const webhookSecret = Deno.env.get("CHAPA_WEBHOOK_SECRET");
  if (!webhookSecret) return new Response("Webhook secret not configured", { status: 500 });

  // Chapa sends two signature headers. `x-chapa-signature` is the HMAC of
  // the raw request body; `Chapa-Signature` is the HMAC of the secret hash
  // itself. Accept either so we tolerate Chapa's documented variations.
  const bodyHmac = await hmacSha256Hex(webhookSecret, rawBody);
  const secretHmac = await hmacSha256Hex(webhookSecret, webhookSecret);
  const provided =
    req.headers.get("x-chapa-signature") ?? req.headers.get("Chapa-Signature") ?? "";
  if (!timingSafeEqual(provided, bodyHmac) && !timingSafeEqual(provided, secretHmac)) {
    return new Response("Invalid signature", { status: 401 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new Response("Invalid payload", { status: 400 });
  }

  const txRef = (payload.tx_ref ?? payload.trx_ref) as string | undefined;
  if (!txRef) return new Response("Missing tx_ref", { status: 400 });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceKey);

  const secretKey = Deno.env.get("CHAPA_SECRET_KEY");
  if (!secretKey) return new Response("Chapa not configured", { status: 500 });

  // Always re-verify with Chapa's API rather than trusting the webhook body.
  const verifyRes = await fetch(
    `https://api.chapa.co/v1/transaction/verify/${encodeURIComponent(txRef)}`,
    { headers: { Authorization: `Bearer ${secretKey}` } },
  );
  const verifyData = await verifyRes.json();

  if (!verifyRes.ok || verifyData.status !== "success" || verifyData.data?.status !== "success") {
    await admin.from("payments").update({ status: "failed" }).eq("id", txRef).eq("status", "pending");
    return new Response("Payment not successful", { status: 200 });
  }

  const { data: result, error } = await admin.rpc("finalize_checkout", {
    p_payment_id: txRef,
    p_provider_ref: String(verifyData.data.reference ?? verifyData.data.tx_ref ?? txRef),
  });

  if (error) {
    console.error("finalize_checkout failed", error);
    return new Response("Finalize failed", { status: 500 });
  }

  // already_finalized => duplicate webhook delivery, nothing more to do.
  if (!result.already_finalized) {
    await sendReceiptEmail(admin, txRef, result);
  }

  return new Response("ok", { status: 200 });
});

async function sendReceiptEmail(
  admin: ReturnType<typeof createClient>,
  paymentId: string,
  result: Record<string, unknown>,
) {
  const resendKey = Deno.env.get("RESEND_API_KEY");
  const resendFrom = Deno.env.get("RESEND_FROM_EMAIL");
  if (!resendKey || !resendFrom) {
    console.warn("RESEND_API_KEY or RESEND_FROM_EMAIL not set; skipping confirmation email.");
    return;
  }

  const { data: contact } = await admin
    .from("checkout_contacts")
    .select("full_name, email")
    .eq("payment_id", paymentId)
    .single();
  if (!contact?.email) return;

  const { data: raffle } = await admin
    .from("raffles")
    .select("title, draw_date")
    .eq("id", result.raffle_id as string)
    .single();

  const ticketRange =
    result.first_ticket === result.last_ticket
      ? `#${result.first_ticket}`
      : `#${result.first_ticket}–#${result.last_ticket}`;

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: resendFrom,
      to: contact.email,
      subject: `You're in! Your tickets for ${raffle?.title ?? "the raffle"}`,
      html: `
        <p>Hi ${contact.full_name ?? "there"},</p>
        <p>You're in — good luck! Here's your receipt:</p>
        <ul>
          <li><strong>Raffle:</strong> ${raffle?.title ?? ""}</li>
          <li><strong>Tickets:</strong> ${result.total} (${result.paid} paid${
        (result.free as number) > 0 ? ` + ${result.free} free bonus` : ""
      })</li>
          <li><strong>Ticket numbers:</strong> ${ticketRange}</li>
          <li><strong>Amount paid:</strong> ${result.amount} ETB</li>
          ${raffle?.draw_date ? `<li><strong>Draw date:</strong> ${raffle.draw_date}</li>` : ""}
        </ul>
        <p>Thanks for entering!</p>
      `,
    }),
  });
}
