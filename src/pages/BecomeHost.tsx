import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Sparkles,
  ArrowRight,
  Loader2,
  AlertCircle,
  ShieldCheck,
  Wallet,
  Megaphone,
} from "lucide-react";
import { PublicShell } from "@/components/layout/PublicShell";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/lib/auth";
import { useMode } from "@/lib/mode";
import { supabase } from "@/lib/supabase";

const PERKS = [
  {
    icon: Wallet,
    title: "No monthly fees",
    body: "You only pay a commission when a raffle actually sells — nothing up front.",
  },
  {
    icon: ShieldCheck,
    title: "Escrow & guarantee",
    body: "Entrant payments are held safely and released once you confirm prize delivery.",
  },
  {
    icon: Megaphone,
    title: "Your own listings",
    body: "Create raffles, set prizes and bundles, and track sales from one dashboard.",
  },
];

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-lg">
      <div className="glass-strong relative overflow-hidden rounded-2xl p-8">
        <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-accent/25 blur-3xl" />
        <div className="relative">{children}</div>
      </div>
    </div>
  );
}

export default function BecomeHost() {
  const navigate = useNavigate();
  const { session, profile, refreshProfile, setLoginContext } = useAuth();
  const { canHost, setMode } = useMode();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startHosting() {
    setError(null);
    setLoading(true);
    const { error } = await supabase.rpc("request_host_access");
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    // Pull the upgraded role into context, then enter host mode. We flip the
    // login-context and navigate directly (rather than calling setMode, whose
    // capability check is still closed over the pre-upgrade role).
    await refreshProfile();
    setLoginContext("host");
    navigate("/en/dashboard");
  }

  // Not signed in: route them to create a host account.
  if (!session) {
    return (
      <PublicShell>
        <Card>
          <span className="grid h-12 w-12 place-items-center rounded-xl bg-accent-gradient shadow-accent-glow">
            <Sparkles strokeWidth={1.75} className="h-6 w-6 text-white" />
          </span>
          <h1 className="mt-5 text-2xl font-bold tracking-tight text-ink">
            Host a raffle
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-ink-muted">
            Create an account to start hosting — it takes a minute and there are
            no setup fees.
          </p>
          <div className="mt-6 flex flex-col gap-3">
            <Link to="/en/host/login?tab=signup">
              <Button variant="primary" size="lg" className="w-full">
                Create a host account
                <ArrowRight strokeWidth={1.5} className="h-[18px] w-[18px]" />
              </Button>
            </Link>
            <Link to="/en/host/login">
              <Button variant="secondary" size="lg" className="w-full">
                I already have an account
              </Button>
            </Link>
          </div>
        </Card>
      </PublicShell>
    );
  }

  // Already host-capable: nothing to upgrade, just go host.
  if (canHost) {
    return (
      <PublicShell>
        <Card>
          <span className="grid h-12 w-12 place-items-center rounded-xl bg-accent-gradient shadow-accent-glow">
            <Sparkles strokeWidth={1.75} className="h-6 w-6 text-white" />
          </span>
          <h1 className="mt-5 text-2xl font-bold tracking-tight text-ink">
            You're set up to host
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-ink-muted">
            Your account already has hosting enabled. Head to your dashboard to
            create or manage a raffle.
          </p>
          <div className="mt-6">
            <Button
              variant="primary"
              size="lg"
              className="w-full"
              onClick={() => setMode("host")}
            >
              Go to host dashboard
              <ArrowRight strokeWidth={1.5} className="h-[18px] w-[18px]" />
            </Button>
          </div>
        </Card>
      </PublicShell>
    );
  }

  // Signed-in entrant: explain hosting, then upgrade on confirm.
  const firstName = profile?.full_name?.trim().split(/\s+/)[0];
  return (
    <PublicShell>
      <Card>
        <span className="grid h-12 w-12 place-items-center rounded-xl bg-accent-gradient shadow-accent-glow">
          <Sparkles strokeWidth={1.75} className="h-6 w-6 text-white" />
        </span>
        <h1 className="mt-5 text-2xl font-bold tracking-tight text-ink">
          Start hosting{firstName ? `, ${firstName}` : ""}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">
          Hosting is added to your existing account — you keep entering raffles,
          and gain a dashboard to run your own.
        </p>

        <ul className="mt-6 space-y-4">
          {PERKS.map((perk) => (
            <li key={perk.title} className="flex gap-3">
              <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-line bg-surface">
                <perk.icon strokeWidth={1.5} className="h-4 w-4 text-accent-soft" />
              </span>
              <div>
                <p className="text-sm font-semibold text-ink">{perk.title}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-ink-muted">
                  {perk.body}
                </p>
              </div>
            </li>
          ))}
        </ul>

        {error && (
          <div className="mt-5 flex items-start gap-2 rounded-xl border border-rose-400/30 bg-rose-400/10 p-3 text-sm text-rose-200">
            <AlertCircle strokeWidth={1.5} className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        <div className="mt-6">
          <Button
            variant="primary"
            size="lg"
            className="w-full"
            onClick={startHosting}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Setting up hosting…
              </>
            ) : (
              <>
                Start hosting
                <ArrowRight strokeWidth={1.5} className="h-[18px] w-[18px]" />
              </>
            )}
          </Button>
          <p className="mt-3 text-center text-xs text-ink-subtle">
            See our{" "}
            <Link to="/en/pricing" className="text-accent-soft hover:text-ink">
              commission &amp; fees
            </Link>{" "}
            first.
          </p>
        </div>
      </Card>
    </PublicShell>
  );
}
