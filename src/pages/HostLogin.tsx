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
  ChevronDown,
  Loader2,
  AlertCircle,
  MailCheck,
  Sparkles,
  PencilRuler,
  Share2,
  Trophy,
} from "lucide-react";
import { AuroraBackground } from "@/components/ui/AuroraBackground";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Form";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { useSiteScale } from "@/hooks/useSiteScale";

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

/** Two chevrons chasing each other top-to-bottom between adjacent step cards. */
function FlowArrow() {
  return (
    <div className="relative flex h-7 w-6 shrink-0 items-center justify-center overflow-hidden">
      {[0, 1].map((i) => (
        <motion.span
          key={i}
          className="absolute inset-x-0 top-0 flex justify-center"
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: [0, 1, 0], y: [-6, 20] }}
          transition={{
            duration: 1.2,
            repeat: Infinity,
            delay: i * 0.5,
            ease: "easeInOut",
          }}
        >
          <ChevronDown strokeWidth={2.5} className="h-5 w-5 text-accent-soft" />
        </motion.span>
      ))}
    </div>
  );
}

/** Individual step cards (~40% larger than the prior compact strip), linked by animated falling arrows. */
function StepsStrip() {
  return (
    <div className="mt-5">
      <h2 className="text-center text-xl font-extrabold tracking-tight text-ink">
        Live in <span className="text-gradient">three simple steps</span>
      </h2>
      <div className="mt-4 flex flex-col items-center">
        {steps.map((step, i) => (
          <div key={step.title} className="w-full">
            <div className="flex items-start gap-3.5 rounded-2xl border border-line bg-surface p-4 shadow-sm">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-accent-gradient shadow-accent-glow">
                <step.icon strokeWidth={1.75} className="h-[22px] w-[22px] text-white" />
              </span>
              <div className="pt-0.5">
                <p className="text-[15px] font-bold tracking-tight text-ink">{step.title}</p>
                <p className="mt-1 text-[13px] leading-relaxed text-ink-muted">{step.body}</p>
              </div>
            </div>
            {i < steps.length - 1 && (
              <div className="flex justify-center">
                <FlowArrow />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Dedicated Host portal — the only page a "Host a raffle" entry point should
 * link to. One page, two tabs (sign in / sign up), both locked to the host
 * role: there's no role picker and no third-party auth, because every
 * visitor here already knows why they came. Fields are deliberately blank
 * (autoComplete="off" + unique names) so a browser's saved credentials never
 * pre-fill either tab.
 */
export default function HostLogin() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { currentScale } = useSiteScale();
  const { setLoginContext, authError, clearAuthError } = useAuth();
  const [tab, setTab] = useState<"signin" | "signup" | null>(
    searchParams.get("tab") === "signup" ? "signup" : null,
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
    <div className="relative min-h-screen overflow-x-hidden" style={{ zoom: currentScale }}>
      <AuroraBackground />

      <div className="relative mx-auto flex min-h-screen max-w-sm flex-col px-5 pt-10 pb-4">
        <Link to="/en" className="mx-auto mb-3 flex items-center gap-2">
          <div className="grid h-7 w-7 place-items-center rounded-lg bg-accent-gradient shadow-accent-glow">
            <Sparkles strokeWidth={2} className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="text-sm font-bold tracking-tight text-ink">Raffall</span>
        </Link>

        {checkEmail ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-line bg-surface p-6 text-center">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-accent-gradient shadow-accent-glow">
              <MailCheck strokeWidth={1.5} className="h-6 w-6 text-white" />
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
            <div className="grid grid-cols-2 gap-1 rounded-xl border border-line bg-surface p-1">
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
              <div className="mt-3 flex items-start gap-2 rounded-xl border border-rose-400/30 bg-rose-400/10 p-2.5 text-xs text-rose-200">
                <AlertCircle strokeWidth={1.5} className="mt-0.5 h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            {tab === "signin" && (
              <form onSubmit={signIn} autoComplete="off" className="mt-2.5 space-y-2">
                <Field label="Email" htmlFor="host-signin-email">
                  <div className="relative">
                    <Mail
                      strokeWidth={1.5}
                      className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-ink-subtle"
                    />
                    <Input
                      id="host-signin-email"
                      name="host-signin-email"
                      type="email"
                      required
                      autoComplete="off"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="h-10 pl-11"
                    />
                  </div>
                </Field>

                <Field label="Password" htmlFor="host-signin-password">
                  <div className="relative">
                    <Lock
                      strokeWidth={1.5}
                      className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-ink-subtle"
                    />
                    <Input
                      id="host-signin-password"
                      name="host-signin-password"
                      type={showPw ? "text" : "password"}
                      required
                      autoComplete="off"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Password"
                      className="h-10 px-11"
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

                <div className="flex items-center justify-end text-xs">
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
                  <p className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-2.5 text-xs text-emerald-200">
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
                      Sign in
                      <ArrowRight strokeWidth={1.5} className="h-[18px] w-[18px]" />
                    </>
                  )}
                </Button>
              </form>
            )}

            {tab === "signup" && (
              <form onSubmit={signUp} autoComplete="off" className="mt-2.5 space-y-2">
                <Field label="Full name" htmlFor="host-signup-name">
                  <div className="relative">
                    <User
                      strokeWidth={1.5}
                      className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-ink-subtle"
                    />
                    <Input
                      id="host-signup-name"
                      name="host-signup-name"
                      required
                      autoComplete="off"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Jordan Miller"
                      className="h-10 pl-11"
                    />
                  </div>
                </Field>

                <Field label="Email" htmlFor="host-signup-email">
                  <div className="relative">
                    <Mail
                      strokeWidth={1.5}
                      className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-ink-subtle"
                    />
                    <Input
                      id="host-signup-email"
                      name="host-signup-email"
                      type="email"
                      required
                      autoComplete="off"
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="h-10 pl-11"
                    />
                  </div>
                </Field>

                <Field label="Password" htmlFor="host-signup-password" hint="8+ characters">
                  <div className="relative">
                    <Lock
                      strokeWidth={1.5}
                      className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-ink-subtle"
                    />
                    <Input
                      id="host-signup-password"
                      name="host-signup-password"
                      type="password"
                      required
                      minLength={8}
                      autoComplete="off"
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      placeholder="Password"
                      className="h-10 pl-11"
                    />
                  </div>
                </Field>

                <Field label="Date of birth" htmlFor="host-signup-dob" hint="You must be 18+">
                  <div className="relative">
                    <Cake
                      strokeWidth={1.5}
                      className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-ink-subtle"
                    />
                    <Input
                      id="host-signup-dob"
                      name="host-signup-dob"
                      type="date"
                      required
                      autoComplete="off"
                      value={dateOfBirth}
                      onChange={(e) => setDateOfBirth(e.target.value)}
                      className="h-10 pl-11"
                    />
                  </div>
                </Field>

                <label className="flex cursor-pointer items-start gap-2 text-[11px] leading-snug text-ink-muted">
                  <input
                    type="checkbox"
                    required
                    className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded border-line bg-surface accent-[#8b5cf6]"
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

            <StepsStrip />
          </>
        )}
      </div>
    </div>
  );
}
