import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  Trophy,
  CheckCircle2,
  PackageCheck,
  PencilLine,
  ShieldX,
  ShieldCheck,
  Wallet,
  Clock,
  Hash,
  Fingerprint,
  Mail,
  MapPin,
  Watch,
  PartyPopper,
  Inbox,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { SpotlightCard } from "@/components/ui/SpotlightCard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { CountdownPills } from "@/components/ui/Countdown";
import { useAuth } from "@/lib/auth";
import {
  fetchEndedRaffleForHost,
  confirmPrize,
  withdrawRevenue,
  type EndedRaffleDetail,
} from "@/lib/raffles";
import { formatCurrency, cn } from "@/lib/utils";

type Flow = "pending" | "confirmed" | "revoked" | "withdrawn";
type Decision = "advertised" | "modified" | "revoke";

const decisions: {
  key: Decision;
  label: string;
  desc: string;
  icon: typeof PackageCheck;
  tone: "ok" | "warn" | "danger";
}[] = [
  {
    key: "advertised",
    label: "Prize as advertised",
    desc: "The winner receives exactly what was listed.",
    icon: PackageCheck,
    tone: "ok",
  },
  {
    key: "modified",
    label: "Modified prize",
    desc: "A change was agreed with the winner.",
    icon: PencilLine,
    tone: "warn",
  },
  {
    key: "revoke",
    label: "Revoke prize",
    desc: "Triggers the Raffall Guarantee — you forfeit revenue.",
    icon: ShieldX,
    tone: "danger",
  },
];

function flowFrom(d: EndedRaffleDetail): Flow {
  if (d.revenueReleased) return "withdrawn";
  if (d.prizeStatus === "confirmed") return "confirmed";
  if (d.prizeStatus === "revoked") return "revoked";
  return "pending";
}

export default function EndedRaffle() {
  const { user } = useAuth();
  const [detail, setDetail] = useState<EndedRaffleDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [flow, setFlow] = useState<Flow>("pending");
  const [choice, setChoice] = useState<Decision>("advertised");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let active = true;
    fetchEndedRaffleForHost(user.id).then((d) => {
      if (!active) return;
      setDetail(d);
      if (d) setFlow(flowFrom(d));
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [user]);

  // Host must confirm within 7 days of the draw.
  const deadline = useMemo(() => {
    const base = detail?.drawnAt ? new Date(detail.drawnAt).getTime() : Date.now();
    return new Date(base + 7 * 86_400_000).toISOString();
  }, [detail]);

  async function submitDecision() {
    if (!detail) return;
    setError(null);
    setBusy(true);
    try {
      const res = await confirmPrize(detail.id, choice);
      setFlow(res.prize_status === "revoked" ? "revoked" : "confirmed");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not submit your decision.");
    } finally {
      setBusy(false);
    }
  }

  async function withdraw() {
    if (!detail) return;
    setError(null);
    setBusy(true);
    try {
      await withdrawRevenue(detail.id);
      setFlow("withdrawn");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not process withdrawal.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <AppShell>
        <div className="grid min-h-[50vh] place-items-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-accent" />
        </div>
      </AppShell>
    );
  }

  if (!detail) {
    return (
      <AppShell>
        <div className="mx-auto flex min-h-[55vh] max-w-md flex-col items-center justify-center text-center">
          <div className="grid h-16 w-16 place-items-center rounded-2xl border border-white/10 bg-white/[0.04] text-zinc-500">
            <Inbox strokeWidth={1.5} className="h-8 w-8" />
          </div>
          <h1 className="mt-6 text-2xl font-bold tracking-tight text-white">
            No ended raffles yet
          </h1>
          <p className="mt-2 text-sm text-zinc-400">
            When one of your raffles reaches its draw date or sells out, the
            automated draw fires and the winner appears here for confirmation.
          </p>
          <Link to="/en/dashboard" className="mt-6">
            <Button variant="secondary" size="md">
              <ArrowLeft strokeWidth={1.5} className="h-[18px] w-[18px]" />
              Back to dashboard
            </Button>
          </Link>
        </div>
      </AppShell>
    );
  }

  const guaranteePayout = detail.gross * 0.75;
  const drawnLabel = detail.drawnAt
    ? new Date(detail.drawnAt).toLocaleString("en-GB", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "recently";

  const auditRows: [string, string][] = detail.audit
    ? [
        ["method", detail.audit.method],
        ["seed", `${detail.audit.seed.slice(0, 16)}… (sealed)`],
        ["entries", detail.audit.entries.toLocaleString()],
        ["drawn_index", detail.audit.drawnIndex?.toLocaleString() ?? "—"],
        ["drawn_ticket", detail.audit.drawnTicket?.toLocaleString() ?? "—"],
        ["timestamp", new Date(detail.audit.timestamp).toISOString()],
      ]
    : [];

  return (
    <AppShell>
      <Link
        to="/en/dashboard"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-zinc-400 transition-colors hover:text-white"
      >
        <ArrowLeft strokeWidth={1.5} className="h-4 w-4" />
        Back to dashboard
      </Link>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-xl border border-white/10 bg-white/[0.04] text-accent-soft">
          <Watch strokeWidth={1.5} className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tightest text-white sm:text-3xl">
            {detail.title}
          </h1>
          <p className="text-sm text-zinc-500">Draw completed {drawnLabel}</p>
        </div>
        <Badge tone="neutral" className="ml-auto">
          Ended
        </Badge>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left: winner + audit */}
        <div className="space-y-6 lg:col-span-2">
          <SpotlightCard className="overflow-hidden" lift={false}>
            <div className="relative border-b border-white/[0.06] bg-gradient-to-br from-accent/15 via-transparent to-transparent p-6">
              <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-accent/25 blur-3xl" />
              <div className="relative flex items-center gap-4">
                <div className="relative">
                  <span className="grid h-16 w-16 place-items-center rounded-2xl bg-accent-gradient text-xl font-bold text-white shadow-accent-glow">
                    {detail.winner?.initials ?? "—"}
                  </span>
                  <span className="absolute -bottom-1.5 -right-1.5 grid h-7 w-7 place-items-center rounded-full border-2 border-obsidian bg-amber-400 text-obsidian">
                    <Trophy strokeWidth={2} className="h-3.5 w-3.5" />
                  </span>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider text-accent-soft">
                    Winner selected
                  </p>
                  <p className="text-xl font-bold tracking-tight text-white">
                    {detail.winner?.name ?? "No entrants"}
                  </p>
                  <p className="inline-flex items-center gap-1.5 text-sm text-zinc-400">
                    <Hash className="h-3.5 w-3.5" />
                    {detail.winner?.ticket != null
                      ? `Winning ticket #${detail.winner.ticket.toLocaleString()}`
                      : "—"}
                  </p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-px bg-white/[0.06] sm:grid-cols-2">
              <div className="flex items-center gap-3 bg-obsidian/40 p-4 text-sm">
                <Mail strokeWidth={1.5} className="h-4 w-4 text-zinc-500" />
                <span className="text-zinc-300">{detail.winner?.email ?? "—"}</span>
              </div>
              <div className="flex items-center gap-3 bg-obsidian/40 p-4 text-sm">
                <MapPin strokeWidth={1.5} className="h-4 w-4 text-zinc-500" />
                <span className="text-zinc-300">{detail.winner?.region ?? "—"}</span>
              </div>
            </div>
          </SpotlightCard>

          <SpotlightCard className="p-6" lift={false}>
            <h2 className="inline-flex items-center gap-2 text-[15px] font-semibold tracking-tight text-white">
              <Fingerprint strokeWidth={1.5} className="h-[18px] w-[18px] text-accent-soft" />
              Draw audit log
            </h2>
            <p className="mt-1 text-xs text-zinc-500">
              Every draw is logged for dispute evidence — the outcome can't be
              altered by anyone.
            </p>
            {auditRows.length > 0 ? (
              <dl className="mt-4 space-y-px overflow-hidden rounded-xl border border-white/10 font-mono text-xs">
                {auditRows.map(([k, v]) => (
                  <div
                    key={k}
                    className="flex items-center justify-between gap-4 bg-white/[0.02] px-4 py-2.5"
                  >
                    <dt className="text-zinc-500">{k}</dt>
                    <dd className="truncate text-zinc-300">{v}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="mt-4 text-sm text-zinc-500">No audit record found.</p>
            )}
          </SpotlightCard>
        </div>

        {/* Right: action panel */}
        <div className="lg:col-span-1">
          <div className="space-y-4 lg:sticky lg:top-24">
            <div className="glass-strong p-5">
              <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                Revenue (in escrow)
              </p>
              <p className="mt-1 text-3xl font-bold tracking-tight text-white">
                {formatCurrency(flow === "revoked" ? 0 : detail.hostNet)}
              </p>
              <dl className="mt-4 space-y-1.5 border-t border-white/[0.06] pt-3 text-sm">
                <div className="flex justify-between text-zinc-400">
                  <span>Gross sales</span>
                  <span className="tabular-nums">{formatCurrency(detail.gross)}</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Commission</span>
                  <span className="tabular-nums">−{formatCurrency(detail.commission)}</span>
                </div>
              </dl>
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-xl border border-rose-400/30 bg-rose-400/10 p-3 text-sm text-rose-200">
                <AlertCircle strokeWidth={1.5} className="mt-0.5 h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            <AnimatePresence mode="wait">
              {flow === "pending" && (
                <motion.div
                  key="pending"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  className="glass-strong p-5"
                >
                  <p className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-amber-300">
                    <Clock strokeWidth={1.5} className="h-4 w-4" />
                    Confirm within
                  </p>
                  <CountdownPills drawDate={deadline} />
                  <p className="mt-3 text-xs leading-relaxed text-zinc-500">
                    Confirm the prize was delivered to release your funds. If the
                    timer expires, the Raffall Guarantee pays the winner 75%.
                  </p>

                  <div className="mt-5 space-y-2">
                    {decisions.map((d) => {
                      const active = choice === d.key;
                      return (
                        <button
                          key={d.key}
                          type="button"
                          onClick={() => setChoice(d.key)}
                          className={cn(
                            "focus-ring flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-all duration-300 ease-premium",
                            active
                              ? d.tone === "danger"
                                ? "border-rose-400/50 bg-rose-400/10"
                                : d.tone === "warn"
                                  ? "border-amber-400/50 bg-amber-400/10"
                                  : "border-emerald-400/50 bg-emerald-400/10"
                              : "border-white/10 bg-white/[0.02] hover:border-white/20",
                          )}
                        >
                          <d.icon
                            strokeWidth={1.5}
                            className={cn(
                              "mt-0.5 h-[18px] w-[18px] shrink-0",
                              active
                                ? d.tone === "danger"
                                  ? "text-rose-300"
                                  : d.tone === "warn"
                                    ? "text-amber-300"
                                    : "text-emerald-300"
                                : "text-zinc-400",
                            )}
                          />
                          <span>
                            <span className="block text-sm font-medium text-white">
                              {d.label}
                            </span>
                            <span className="block text-xs leading-relaxed text-zinc-500">
                              {d.desc}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <Button
                    variant="primary"
                    size="lg"
                    onClick={submitDecision}
                    disabled={busy}
                    className="mt-4 w-full"
                  >
                    {busy ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" /> Submitting…
                      </>
                    ) : (
                      "Submit decision"
                    )}
                  </Button>
                </motion.div>
              )}

              {flow === "confirmed" && (
                <motion.div
                  key="confirmed"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass-strong p-5"
                >
                  <div className="flex items-center gap-2.5 text-emerald-300">
                    <CheckCircle2 strokeWidth={1.5} className="h-5 w-5" />
                    <span className="font-semibold">Prize confirmed</span>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                    Your revenue is unlocked. Withdraw to your connected payout
                    account — funds typically arrive same-day.
                  </p>
                  <Button
                    variant="primary"
                    size="lg"
                    onClick={withdraw}
                    disabled={busy}
                    className="mt-4 w-full"
                  >
                    {busy ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" /> Processing…
                      </>
                    ) : (
                      <>
                        <Wallet strokeWidth={1.5} className="h-5 w-5" />
                        Withdraw {formatCurrency(detail.hostNet)}
                      </>
                    )}
                  </Button>
                </motion.div>
              )}

              {flow === "withdrawn" && (
                <motion.div
                  key="withdrawn"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="glass-strong p-6 text-center"
                >
                  <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-accent-gradient shadow-accent-glow">
                    <PartyPopper strokeWidth={1.5} className="h-7 w-7 text-white" />
                  </div>
                  <p className="mt-4 font-semibold text-white">Payout on its way</p>
                  <p className="mt-1.5 text-sm text-zinc-400">
                    {formatCurrency(detail.hostNet)} is being transferred to your
                    account.
                  </p>
                </motion.div>
              )}

              {flow === "revoked" && (
                <motion.div
                  key="revoked"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass-strong border-rose-400/20 p-5"
                >
                  <div className="flex items-center gap-2.5 text-rose-300">
                    <ShieldX strokeWidth={1.5} className="h-5 w-5" />
                    <span className="font-semibold">Prize revoked</span>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                    The Raffall Guarantee has been triggered. The winner will
                    receive{" "}
                    <span className="font-semibold text-zinc-200">
                      {formatCurrency(guaranteePayout)}
                    </span>{" "}
                    (75% of gross), paid by the platform. You forfeit this
                    raffle's revenue.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="glass flex items-start gap-3 p-4">
              <ShieldCheck strokeWidth={1.5} className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
              <p className="text-xs leading-relaxed text-zinc-400">
                Funds stay in escrow until you confirm delivery — this protects
                both you and your winner.
              </p>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
