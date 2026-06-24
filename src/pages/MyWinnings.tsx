import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Trophy, Hash, ShieldCheck, ShieldX, Clock, Award } from "lucide-react";
import { PublicShell } from "@/components/layout/PublicShell";
import { SpotlightCard } from "@/components/ui/SpotlightCard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/lib/auth";
import { fetchMyWinnings, respondToWin, type MyWinning } from "@/lib/raffles";

const statusBadge: Record<MyWinning["prizeStatus"], { tone: "warning" | "live" | "info" | "neutral"; label: string }> = {
  awaiting_claim: { tone: "warning", label: "Awaiting your response" },
  claimed: { tone: "info", label: "Claimed" },
  accepted: { tone: "live", label: "Accepted" },
  disputed: { tone: "info", label: "Disputed" },
  compensated: { tone: "neutral", label: "Compensated" },
};

const compensatedNote =
  "The host didn't confirm delivery within their 7-day window, so the Raffall Guarantee paid you 75% of gross ticket revenue automatically.";

export default function MyWinnings() {
  const { user } = useAuth();
  const [winnings, setWinnings] = useState<MyWinning[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let active = true;
    fetchMyWinnings(user.id).then((w) => {
      if (!active) return;
      setWinnings(w);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [user]);

  async function respond(winnerId: string, decision: "accept" | "dispute") {
    setBusyId(winnerId);
    setError(null);
    try {
      const { prizeStatus } = await respondToWin(winnerId, decision);
      setWinnings((prev) =>
        prev.map((w) =>
          w.winnerId === winnerId
            ? { ...w, prizeStatus: prizeStatus as MyWinning["prizeStatus"] }
            : w,
        ),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <PublicShell>
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="mb-8"
      >
        <Badge tone="accent">
          {winnings.length} {winnings.length === 1 ? "prize" : "prizes"} won
        </Badge>
        <h1 className="mt-4 text-4xl font-bold tracking-tightest text-white sm:text-5xl">
          My <span className="text-gradient">winnings</span>
        </h1>
        <p className="mt-3 max-w-xl text-zinc-400">
          Accept or dispute a prize before its claim deadline.
        </p>
      </motion.div>

      {error && (
        <div className="mb-5 rounded-xl border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-300">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid gap-5 sm:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="glass h-44 animate-pulse" />
          ))}
        </div>
      ) : winnings.length === 0 ? (
        <div className="glass flex flex-col items-center justify-center gap-3 py-20 text-center">
          <div className="grid h-14 w-14 place-items-center rounded-2xl border border-white/10 bg-white/[0.04] text-zinc-500">
            <Award strokeWidth={1.5} className="h-7 w-7" />
          </div>
          <p className="text-base font-semibold text-white">No wins yet</p>
          <p className="max-w-xs text-sm text-zinc-500">
            When you win a raffle, your prize will show up here for you to accept or dispute.
          </p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2">
          {winnings.map((w, i) => {
            const badge = statusBadge[w.prizeStatus];
            const deadlinePassed = w.claimDeadline ? new Date(w.claimDeadline) < new Date() : false;
            const canRespond = w.prizeStatus === "awaiting_claim" && !deadlinePassed;
            return (
              <motion.div
                key={w.winnerId}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] }}
              >
                <SpotlightCard className="h-full p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <Link
                        to={`/en/raffle/${w.raffleSlug}`}
                        className="block text-[15px] font-semibold leading-snug tracking-tight text-white transition-colors hover:text-accent-soft"
                      >
                        {w.raffleTitle}
                      </Link>
                      {w.ticketNumber != null && (
                        <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-zinc-400">
                          <Hash className="h-3.5 w-3.5" />
                          Winning ticket #{w.ticketNumber}
                        </p>
                      )}
                    </div>
                    <Badge tone={badge.tone}>{badge.label}</Badge>
                  </div>

                  <div className="mt-4 flex items-center gap-3">
                    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-accent-gradient text-white shadow-accent-glow">
                      <Trophy strokeWidth={1.75} className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 text-sm text-zinc-400">
                      {w.claimDeadline ? (
                        <p className="inline-flex items-center gap-1.5">
                          <Clock strokeWidth={1.5} className="h-3.5 w-3.5" />
                          {deadlinePassed ? "Deadline passed" : "Respond by"}{" "}
                          <span className="font-medium text-zinc-200">
                            {new Date(w.claimDeadline).toLocaleDateString("en-GB", {
                              day: "numeric",
                              month: "long",
                              year: "numeric",
                            })}
                          </span>
                        </p>
                      ) : (
                        <p>No claim deadline set.</p>
                      )}
                    </div>
                  </div>

                  {w.prizeStatus === "compensated" && (
                    <p className="mt-4 border-t border-white/[0.06] pt-3 text-xs leading-relaxed text-zinc-500">
                      {compensatedNote}
                    </p>
                  )}

                  {canRespond && (
                    <div className="mt-4 flex gap-2 border-t border-white/[0.06] pt-3">
                      <Button
                        variant="primary"
                        size="sm"
                        disabled={busyId === w.winnerId}
                        onClick={() => respond(w.winnerId, "accept")}
                        className="flex-1"
                      >
                        <ShieldCheck strokeWidth={1.5} className="h-4 w-4" />
                        Accept
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={busyId === w.winnerId}
                        onClick={() => respond(w.winnerId, "dispute")}
                        className="flex-1"
                      >
                        <ShieldX strokeWidth={1.5} className="h-4 w-4" />
                        Dispute
                      </Button>
                    </div>
                  )}
                </SpotlightCard>
              </motion.div>
            );
          })}
        </div>
      )}
    </PublicShell>
  );
}
