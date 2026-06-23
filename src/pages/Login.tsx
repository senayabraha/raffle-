import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff, ArrowRight, Loader2, AlertCircle } from "lucide-react";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { GoogleButton } from "@/components/auth/OAuthButton";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Form";
import { supabase } from "@/lib/supabase";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    navigate("/en/dashboard");
  }

  async function google() {
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/en/dashboard` },
    });
    if (error) setError(error.message);
  }

  return (
    <AuthLayout title="Welcome back" subtitle="Log in to manage your raffles and payouts.">
      <GoogleButton label="Continue with Google" onClick={google} />

      <div className="my-5 flex items-center gap-3 text-xs text-zinc-600">
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
              className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-zinc-500"
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
              className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-zinc-500"
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
              className="focus-ring absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-zinc-500 transition-colors hover:text-zinc-200"
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
          <label className="flex cursor-pointer items-center gap-2 text-zinc-400">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-white/20 bg-white/[0.03] accent-[#8b5cf6]"
            />
            Remember me
          </label>
          <a href="#" className="font-medium text-accent-soft transition-colors hover:text-white">
            Forgot password?
          </a>
        </div>

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

      <p className="mt-6 text-center text-sm text-zinc-400">
        New to Raffall?{" "}
        <Link to="/en/register" className="font-medium text-accent-soft transition-colors hover:text-white">
          Create an account
        </Link>
      </p>
    </AuthLayout>
  );
}
