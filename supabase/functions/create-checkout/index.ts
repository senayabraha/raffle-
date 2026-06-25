// Creates a pending payment + checkout contact, then starts a hosted
// checkout session with the chosen Ethiopian payment provider (Chapa or
// Telebirr) and returns the URL to redirect the participant to.
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

interface CheckoutBody {
  raffleId: string;
  raffleSlug: string;
  qty: number;
  provider: "chapa" | "telebirr";
  fullName: string;
  phone: string;
  email: string;
  city: string;
  dateOfBirth: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let body: CheckoutBody;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid request body." }, 400);
  }

  const { raffleId, raffleSlug, qty, provider, fullName, phone, email, city, dateOfBirth } = body;

  if (!raffleId || !qty || !provider || !fullName || !phone || !email || !city || !dateOfBirth) {
    return json({ error: "Missing required checkout fields." }, 400);
  }
  if (provider !== "chapa" && provider !== "telebirr") {
    return json({ error: "Unsupported payment provider." }, 400);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const supabase = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? `Bearer ${anonKey}` } },
  });

  const { data: rpcData, error: rpcError } = await supabase.rpc("create_pending_checkout", {
    p_raffle_id: raffleId,
    p_qty: qty,
    p_provider: provider,
    p_full_name: fullName,
    p_phone: phone,
    p_email: email,
    p_city: city,
    p_date_of_birth: dateOfBirth,
  });

  if (rpcError) {
    return json({ error: rpcError.message }, 400);
  }

  const paymentId = rpcData.payment_id as string;
  const amount = rpcData.amount as number;
  const siteUrl = Deno.env.get("SITE_URL") ?? "https://raffle.example.com";
  const returnUrl = `${siteUrl}/en/checkout/success?paymentId=${paymentId}`;

  try {
    const checkoutUrl =
      provider === "chapa"
        ? await initChapa({ paymentId, amount, email, phone, fullName, returnUrl, supabaseUrl })
        : await initTelebirr({ paymentId, amount, phone, returnUrl });

    return json({ paymentId, checkoutUrl });
  } catch (e) {
    // Mark the pending payment as failed so it doesn't linger silently.
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (serviceKey) {
      const admin = createClient(supabaseUrl, serviceKey);
      await admin.from("payments").update({ status: "failed" }).eq("id", paymentId);
    }
    return json({ error: e instanceof Error ? e.message : "Could not start checkout." }, 502);
  }
});

async function initChapa(opts: {
  paymentId: string;
  amount: number;
  email: string;
  phone: string;
  fullName: string;
  returnUrl: string;
  supabaseUrl: string;
}): Promise<string> {
  const secretKey = Deno.env.get("CHAPA_SECRET_KEY");
  if (!secretKey) throw new Error("Chapa is not configured yet (missing CHAPA_SECRET_KEY).");

  const [firstName, ...rest] = opts.fullName.trim().split(/\s+/);
  const lastName = rest.join(" ") || firstName;

  const res = await fetch("https://api.chapa.co/v1/transaction/initialize", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: String(opts.amount),
      currency: "ETB",
      email: opts.email,
      first_name: firstName,
      last_name: lastName,
      phone_number: opts.phone,
      tx_ref: opts.paymentId,
      callback_url: `${opts.supabaseUrl}/functions/v1/verify-payment`,
      return_url: opts.returnUrl,
    }),
  });
  const data = await res.json();
  if (!res.ok || data.status !== "success") {
    throw new Error(data.message ?? "Chapa could not start the transaction.");
  }
  return data.data.checkout_url as string;
}

async function initTelebirr(_opts: {
  paymentId: string;
  amount: number;
  phone: string;
  returnUrl: string;
}): Promise<string> {
  // Telebirr's merchant API requires an RSA-signed request and merchant
  // app credentials that are not yet provisioned. Wire this up once those
  // credentials are available; until then surface a clear error so the
  // frontend can disable the option instead of silently failing.
  throw new Error("Telebirr checkout is not configured yet. Please choose Chapa for now.");
}
