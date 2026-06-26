import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  User,
  Cake,
  ArrowRight,
  Loader2,
  AlertCircle,
  MailCheck,
  Sparkles,
  PencilRuler,
  Share2,
  Trophy,
} from "lucide-react";
import { AuroraBackground } from "@/components/ui/AuroraBackground";
import { SpotlightCard } from "@/components/ui/SpotlightCard";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Form";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

const HOST_HOME = "/en/dashboard";

const steps = [
  {
    icon: PencilRuler,
    title: "Create",
    body: "List your prize, set ticket price and draw rules in minutes. No code, no fees up front.",
  },
  {
    icon: Share2,
    title: "Share",
    body: "Get a unique link and a scannable QR code to share anywhere — online or in print.",
  },
  {
    icon: Trophy,
    title: "Draw",
    body: "An automated, auditable RNG picks the winner. You can't influence it — and neither can we.",
  },
];

/** Mirrors the DB check constraint: profiles.date_of_birth must be 18+ years ago. */
function isAdult(dateOfBirth: string) {
  const dob = new Date(dateOfBirth);
  if (Number.isNaN(dob.getTime())) return false;
  const adultCutoff = new Date();
  adultCutoff.setFullYear(adultCutoff.getFullYear() - 18);
  return dob <= adultCutoff;
}

/**
 * Dedicated Host portal — the only page a "Host a raffle" entry point should
 * link to. One page, two tabs (sign in / sign up), both locked to the host
 * role: there's no role picker and no third-party auth, because every
 * visitor here already knows why they came.
 */
export default function HostLogin() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setLoginContext, authError, clearAuthError } = useAuth();
  const [tab, setTab] = useState<"signin" | "signup">(
    searchParams.get("tab") === "signup" ? "signup" : "signin",
  );

  // Sign in state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetting, setResetting] = useState(false);

  // Sign up state
  const [fullName, setFullName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [checkEmail, setCheckEmail] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(authError);

  useEffect(() => {
    if (authError) {
      setError(authError);
      clearAuthError();
    }
  }, [authError, clearAuthError]);

  function switchTab(next: "signin" | "signup") {
    setTab(next);
    setError(null);
  }

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    setLoginContext("host");
    navigate(HOST_HOME);
  }

  async function signUp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!isAdult(dateOfBirth)) {
      setError("You must be 18 or older to create an account.");
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: signupEmail,
      password: signupPassword,
      options: { data: { full_name: fullName, role: "host", date_of_birth: dateOfBirth } },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    if (data.session) {
      setLoginContext("host");
      navigate(HOST_HOME);
    } else {
      setCheckEmail(true);
      setLoading(false);
    }
  }

  async function forgotPassword() {
    if (!email.trim()) {
      setError("Enter your email above first, then click \"Forgot password?\".");
      return;
    }
    setError(null);
    setResetting(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/en/host/login`,
    });
    setResetting(false);
    if (error) {
      setError(error.message);
      return;
    }
    setResetSent(true);
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <AuroraBackground />

      <div className="relative mx-auto flex max-w-sm flex-col px-5 pt-16 pb-4 sm:pt-20">
        <Link to="/en" className="mb-8 flex items-center gap-2.5 self-center">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-accent-gradient shadow-accent-glow">
            <Sparkles strokeWidth={2} className="h-[18px] w-[18px] text-white" />
          </div>
          <span className="text-[15px] font-bold tracking-tight text-ink">Raffall</span>
        </Link>

        {checkEmail ? (
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-line bg-surface p-8 text-center">
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-accent-gradient shadow-accent-glow">
              <MailCheck strokeWidth={1.5} className="h-7 w-7 text-white" />
            </span>
            <p className="text-sm leading-relaxed text-ink">
              We sent a confirmation link to{" "}
              <span className="font-semibold text-ink">{signupEmail}</span>. Click it to
              activate your account, then sign in.
            </p>
            <Button
              variant="secondary"
              size="lg"
              className="w-full"
              onClick={() => {
                setCheckEmail(false);
                setTab("signin");
              }}
            >
              Go to sign in
            </Button>
          </div>
        ) : (
          <>
            <h1 className="text-center text-2xl font-bold tracking-tight text-ink sm:text-3xl">
              Host portal
            </h1>
            <p className="mt-2 text-center text-sm text-ink-muted">
              Sign in or create an account to start hosting raffles.
            </p>

            <div className="mt-7 grid grid-cols-2 gap-1 rounded-xl border border-line bg-surface p-1">
              {(["signin", "signup"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => switchTab(t)}
                  className={cn(
                    "focus-ring rounded-lg py-2 text-sm font-semibold transition-all duration-300",
                    tab === t
                      ? "bg-accent-gradient text-white shadow-accent-glow"
                      : "text-ink-muted hover:text-ink",
                  )}
                >
                  {t === "signin" ? "Sign in" : "Sign up"}
                </button>
              ))}
            </div>

            {error && (
              <div className="mt-5 flex items-start gap-2 rounded-xl border border-rose-400/30 bg-rose-400/10 p-3 text-sm text-rose-200">
                <AlertCircle strokeWidth={1.5} className="mt-0.5 h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            {tab === "signin" ? (
              <form onSubmit={signIn} className="mt-5 space-y-4">
                <Field label="Email" htmlFor="email">
                  <div className="relative">
                    <Mail
                      strokeWidth={1.5}
                      className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-ink-subtle"
                    />
                    <Input
                      id="email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="pl-11"
                    />
                  </div>
                </Field>

                <Field label="Password" htmlFor="password">
                  <div className="relative">
                    <Lock
                      strokeWidth={1.5}
                      className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-ink-subtle"
                    />
                    <Input
                      id="password"
                      type={showPw ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="px-11"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw((v) => !v)}
                      className="focus-ring absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-ink-subtle transition-colors hover:text-ink"
                      aria-label={showPw ? "Hide password" : "Show password"}
                    >
                      {showPw ? (
                        <EyeOff strokeWidth={1.5} className="h-[18px] w-[18px]" />
                      ) : (
                        <Eye strokeWidth={1.5} className="h-[18px] w-[18px]" />
                      )}
                    </button>
                  </div>
                </Field>

                <div className="flex items-center justify-end text-sm">
                  <button
                    type="button"
                    onClick={forgotPassword}
                    disabled={resetting}
                    className="font-medium text-accent-soft transition-colors hover:text-ink disabled:opacity-60"
                  >
                    {resetting ? "Sending…" : "Forgot password?"}
                  </button>
                </div>

                {resetSent && (
                  <p className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-3 text-sm text-emerald-200">
                    Check {email} for a link to reset your password.
                  </p>
                )}

                <Button type="submit" variant="primary" size="lg" disabled={loading} className="w-full">
                  {loading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Signing in…
                    </>
                  ) : (
                    <>
                      Log in to Host portal
                      <ArrowRight strokeWidth={1.5} className="h-[18px] w-[18px]" />
                    </>
                  )}
                </Button>
              </form>
            ) : (
              <form onSubmit={signUp} className="mt-5 space-y-4">
                <Field label="Full name" htmlFor="name">
                  <div className="relative">
                    <User
                      strokeWidth={1.5}
                      className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-ink-subtle"
                    />
                    <Input
                      id="name"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Jordan Miller"
                      className="pl-11"
                    />
                  </div>
                </Field>

                <Field label="Email" htmlFor="signup-email">
                  <div className="relative">
                    <Mail
                      strokeWidth={1.5}
                      className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-ink-subtle"
                    />
                    <Input
                      id="signup-email"
                      type="email"
                      required
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="pl-11"
                    />
                  </div>
                </Field>

                <Field label="Password" htmlFor="signup-password" hint="8+ characters">
                  <div className="relative">
                    <Lock
                      strokeWidth={1.5}
                      className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-ink-subtle"
                    />
                    <Input
                      id="signup-password"
                      type="password"
                      required
                      minLength={8}
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      placeholder="••••••••"
                      className="pl-11"
                    />
                  </div>
                </Field>

                <Field label="Date of birth" htmlFor="dob" hint="You must be 18+">
                  <div className="relative">
                    <Cake
                      strokeWidth={1.5}
                      className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-ink-subtle"
                    />
                    <Input
                      id="dob"
                      type="date"
                      required
                      value={dateOfBirth}
                      onChange={(e) => setDateOfBirth(e.target.value)}
                      className="pl-11"
                    />
                  </div>
                </Field>

                <label className="flex cursor-pointer items-start gap-2.5 text-xs leading-relaxed text-ink-muted">
                  <input
                    type="checkbox"
                    required
                    className="mt-0.5 h-4 w-4 shrink-0 rounded border-line bg-surface accent-[#8b5cf6]"
                  />
                  I agree to the{" "}
                  <Link to="/en/terms" className="text-accent-soft hover:text-ink">Terms</Link> &amp;{" "}
                  <Link to="/en/privacy" className="text-accent-soft hover:text-ink">Privacy Policy</Link>.
                </label>

                <Button type="submit" variant="primary" size="lg" disabled={loading} className="w-full">
                  {loading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Creating account…
                    </>
                  ) : (
                    <>
                      Create host account
                      <ArrowRight strokeWidth={1.5} className="h-[18px] w-[18px]" />
                    </>
                  )}
                </Button>
              </form>
            )}
          </>
        )}
      </div>

      {/* ---- How it works (moved here from the homepage) ---- */}
      <section className="relative mx-auto max-w-5xl px-5 py-16">
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-bold tracking-tightest text-ink sm:text-4xl">
            Live in three steps
          </h2>
          <p className="mt-3 text-ink-muted">
            From idea to a fully-running, fair draw — without the busywork.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {steps.map((step, i) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.7, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
            >
              <SpotlightCard className="h-full p-6">
                <div className="flex items-center gap-3">
                  <div className="grid h-11 w-11 place-items-center rounded-xl border border-line bg-surface-2 text-accent-deep dark:text-accent-soft">
                    <step.icon strokeWidth={1.5} className="h-5 w-5" />
                  </div>
                  <span className="text-xs font-semibold text-ink-subtle">
                    0{i + 1}
                  </span>
                </div>
                <h3 className="mt-4 text-lg font-semibold tracking-tight text-ink">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-muted">
                  {step.body}
                </p>
              </SpotlightCard>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
}
