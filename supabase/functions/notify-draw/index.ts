// Called by private.notify_draw() (via pg_net) right after a raffle's draw
// completes. Emails the winning entrant (claim link + deadline) and the
// host (who won, or that the raffle closed with no entries).
import { createClient } from "jsr:@supabase/supabase-js@2";

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  let payload: { raffle_id?: string };
  try {
    payload = await req.json();
  } catch {
    return new Response("Invalid payload", { status: 400 });
  }
  const raffleId = payload.raffle_id;
  if (!raffleId) return new Response("Missing raffle_id", { status: 400 });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceKey);

  const { data: raffle } = await admin
    .from("raffles")
    .select("title, draw_date, host:profiles!raffles_host_id_fkey(full_name, email)")
    .eq("id", raffleId)
    .single();
  if (!raffle) return new Response("Raffle not found", { status: 404 });

  const host = raffle.host as unknown as { full_name: string | null; email: string | null } | null;

  const { data: winnerRow } = await admin
    .from("winners")
    .select(
      "claim_deadline, ticket:tickets!winners_ticket_id_fkey(ticket_number), winner:profiles!winners_winner_id_fkey(full_name, email)",
    )
    .eq("raffle_id", raffleId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const winner = winnerRow?.winner as unknown as { full_name: string | null; email: string | null } | null;
  const ticket = winnerRow?.ticket as unknown as { ticket_number: number } | null;

  await Promise.all([
    sendHostEmail(raffle.title, host, winner, ticket?.ticket_number ?? null),
    winner ? sendWinnerEmail(raffle.title, winner, ticket?.ticket_number ?? null, winnerRow!.claim_deadline) : Promise.resolve(),
  ]);

  return new Response("ok", { status: 200 });
});

function resendConfig() {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("RESEND_FROM_EMAIL");
  if (!apiKey || !from) return null;
  return { apiKey, from };
}

async function sendEmail(to: string, subject: string, html: string) {
  const cfg = resendConfig();
  if (!cfg) {
    console.warn("RESEND_API_KEY or RESEND_FROM_EMAIL not set; skipping email.");
    return;
  }
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${cfg.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: cfg.from, to, subject, html }),
  });
}

async function sendWinnerEmail(
  raffleTitle: string,
  winner: { full_name: string | null; email: string | null },
  ticketNumber: number | null,
  claimDeadline: string | null,
) {
  if (!winner.email) return;
  const siteUrl = Deno.env.get("SITE_URL") ?? "https://raffle.example.com";
  const deadline = claimDeadline
    ? new Date(claimDeadline).toLocaleString("en-GB", { day: "numeric", month: "long", year: "numeric" })
    : "21 days from now";

  await sendEmail(
    winner.email,
    `You won! ${raffleTitle}`,
    `
      <p>Hi ${winner.full_name ?? "there"},</p>
      <p>Congratulations — you won <strong>${raffleTitle}</strong>${
      ticketNumber != null ? ` with ticket #${ticketNumber}` : ""
    }!</p>
      <p>Head to <a href="${siteUrl}/en/winnings">${siteUrl}/en/winnings</a> to accept or dispute your prize before <strong>${deadline}</strong>.</p>
      <p>Congratulations again!</p>
    `,
  );
}

async function sendHostEmail(
  raffleTitle: string,
  host: { full_name: string | null; email: string | null } | null,
  winner: { full_name: string | null; email: string | null } | null,
  ticketNumber: number | null,
) {
  if (!host?.email) return;
  const siteUrl = Deno.env.get("SITE_URL") ?? "https://raffle.example.com";

  const html = winner
    ? `
      <p>Hi ${host.full_name ?? "there"},</p>
      <p>The draw for <strong>${raffleTitle}</strong> is complete.</p>
      <p>Winner: <strong>${winner.full_name ?? "An entrant"}</strong>${
        ticketNumber != null ? ` (ticket #${ticketNumber})` : ""
      }.</p>
      <p>Visit <a href="${siteUrl}/en/dashboard/ended">${siteUrl}/en/dashboard/ended</a> to confirm prize delivery and release your revenue.</p>
    `
    : `
      <p>Hi ${host.full_name ?? "there"},</p>
      <p><strong>${raffleTitle}</strong> closed with no entries, so no winner was drawn.</p>
    `;

  await sendEmail(host.email, `Draw complete: ${raffleTitle}`, html);
}
