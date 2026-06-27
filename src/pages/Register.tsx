import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Mail,
  Lock,
  User,
  ArrowRight,
  Loader2,
  Sparkles,
  Ticket,
  AlertCircle,
  MailCheck,
  Cake,
} from "lucide-react";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { GoogleButton } from "@/components/auth/OAuthButton";
import { Button } from "@/components/ui/Button";
import { Field, Input, Segmented } from "@/components/ui/Form";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

const LOGIN_CONTEXT_STORAGE_KEY = "edl44.loginContext";

/** Mirrors the DB check constraint: profiles.date_of_birth must be 18+ years ago. */
function isAdult(dateOfBirth: string) {
  const dob = new Date(dateOfBirth);
  if (Number.isNaN(dob.getTime())) return false;
  const adultCutoff = new Date();
  adultCutoff.setFullYear(adultCutoff.getFullYear() - 18);
  return dob <= adultCutoff;
}

export default function Register() {
  const navigate = useNavigate();
  const { setLoginContext } = useAuth();
  const [role, setRole] = useState<"host" | "entrant">("host");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkEmail, setCheckEmail] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!isAdult(dateOfBirth)) {
      setError("You must be 18 or older to create an account.");
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, role, date_of_birth: dateOfBirth } },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    // If email confirmation is enabled there's no session yet.
    if (data.session) {
      setLoginContext(role);
      navigate(role === "host" ? "/en/dashboard" : "/en/public-raffles/live");
    } else {
      setCheckEmail(true);
      setLoading(false);
    }
  }

  async function google() {
    setError(null);
    // The chosen role here becomes this session's login context too — the
    // page fully reloads on the OAuth round trip, so stamp it into storage
    // now rather than via React state.
    localStorage.setItem(LOGIN_CONTEXT_STORAGE_KEY, role);
    const destination = role === "host" ? "/en/dashboard" : "/en/public-raffles/live";
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}${destination}` },
    });
    if (error) setError(error.message);
  }

  if (checkEmail) {
    return (
      <AuthLayout title="Check your inbox" subtitle="One quick step to finish up.">
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-line bg-surface p-8 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-accent-gradient shadow-accent-glow">
            <MailCheck strokeWidth={1.5} className="h-7 w-7 text-white" />
          </span>
          <p className="text-sm leading-relaxed text-ink">
            We sent a confirmation link to{" "}
            <span className="font-semibold text-ink">{email}</span>. Click it to
            activate your account, then log in.
          </p>
          <Link to="/en/login" className="w-full">
            <Button variant="secondary" size="lg" className="w-full">
              Go to login
            </Button>
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Start hosting in minutes — no setup fees, ever."
    >
      <GoogleButton label="Sign up with Google" onClick={google} />

      <div className="my-5 flex items-center gap-3 text-xs text-ink-subtle">
        <span className="h-px flex-1 divider-faded" />
        or
        <span className="h-px flex-1 divider-faded" />
      </div>

      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-rose-400/30 bg-rose-400/10 p-3 text-sm text-rose-200">
          <AlertCircle strokeWidth={1.5} className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <form onSubmit={submit} className="space-y-4">
        <Field label="I want to">
          <Segmented
            value={role}
            onChange={setRole}
            options={[
              { value: "host", label: "Host raffles", icon: Sparkles, hint: "Sell tickets & earn" },
              { value: "entrant", label: "Enter & win", icon: Ticket, hint: "Browse and buy" },
            ]}
          />
        </Field>

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

        <Field label="Password" htmlFor="password" hint="8+ characters">
          <div className="relative">
            <Lock
              strokeWidth={1.5}
              className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-ink-subtle"
            />
            <Input
              id="password"
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
              Create account
              <ArrowRight strokeWidth={1.5} className="h-[18px] w-[18px]" />
            </>
          )}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-ink-muted">
        Already have an account?{" "}
        <Link to="/en/login" className="font-medium text-accent-soft transition-colors hover:text-ink">
          Log in
        </Link>
      </p>
    </AuthLayout>
  );
}
