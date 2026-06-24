// Webhook receiver for Chapa payment callbacks. Re-verifies the
// transaction directly with Chapa (never trusts the webhook body alone),
// finalizes the checkout (allocates tickets), and emails a receipt.
import { createClient } from "jsr:@supabase/supabase-js@2";

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
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
