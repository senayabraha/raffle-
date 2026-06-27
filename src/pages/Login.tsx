import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff, ArrowRight, Loader2, AlertCircle } from "lucide-react";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { GoogleButton } from "@/components/auth/OAuthButton";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Form";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { safeRedirectPath } from "@/lib/utils";

const ENTRANT_HOME = "/en/public-raffles/live";
const LOGIN_CONTEXT_STORAGE_KEY = "edl44.loginContext";

/**
 * Public Entrant login. Logging in here always keeps the session in the
 * entrant flow — even if the account also has Host privileges — so anyone
 * mid-checkout lands back where they were instead of being bounced to the
 * Host dashboard. See HostLogin.tsx for the dedicated Host portal.
 */
export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setLoginContext, authError, clearAuthError } = useAuth();
  // Never let an entrant-context login land on the Host dashboard — that's
  // reserved for the dedicated Host portal (Rule B), even if a `redirectTo`
  // pointed there (e.g. a stale link or the public "Hosts" nav item).
  const requestedRedirect = safeRedirectPath(searchParams.get("redirectTo"), ENTRANT_HOME);
  const redirectTo = requestedRedirect.startsWith("/en/dashboard")
    ? ENTRANT_HOME
    : requestedRedirect;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(authError);
  const [resetSent, setResetSent] = useState(false);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    if (authError) {
      setError(authError);
      clearAuthError();
    }
  }, [authError, clearAuthError]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    setLoginContext("entrant");
    navigate(redirectTo);
  }

  async function google() {
    setError(null);
    // The page fully reloads on the OAuth round trip, so the entrant context
    // is stamped into storage now rather than via React state.
    localStorage.setItem(LOGIN_CONTEXT_STORAGE_KEY, "entrant");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}${redirectTo}` },
    });
    if (error) setError(error.message);
  }

  async function forgotPassword() {
    if (!email.trim()) {
      setError("Enter your email above first, then click \"Forgot password?\".");
      return;
    }
    setError(null);
    setResetting(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/en/login`,
    });
    setResetting(false);
    if (error) {
      setError(error.message);
      return;
    }
    setResetSent(true);
  }

  return (
    <AuthLayout title="Welcome back" subtitle="Log in to manage your raffles and payouts.">
      <GoogleButton label="Continue with Google" onClick={google} />

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

        <div className="flex items-center justify-between text-sm">
          <label className="flex cursor-pointer items-center gap-2 text-ink-muted">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-line bg-surface accent-[#8b5cf6]"
            />
            Remember me
          </label>
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
              Log in
              <ArrowRight strokeWidth={1.5} className="h-[18px] w-[18px]" />
            </>
          )}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-ink-muted">
        New to እድል<span className="text-accent">44</span>?{" "}
        <Link to="/en/register" className="font-medium text-accent-soft transition-colors hover:text-ink">
          Create an account
        </Link>
      </p>
      <p className="mt-2 text-center text-xs text-ink-subtle">
        Managing raffles?{" "}
        <Link to="/en/host/login" className="font-medium text-accent-soft transition-colors hover:text-ink">
          Go to the Host portal
        </Link>
      </p>
    </AuthLayout>
  );
}
