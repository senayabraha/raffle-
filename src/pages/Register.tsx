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
} from "lucide-react";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { GoogleButton } from "@/components/auth/OAuthButton";
import { Button } from "@/components/ui/Button";
import { Field, Input, Segmented } from "@/components/ui/Form";

export default function Register() {
  const navigate = useNavigate();
  const [role, setRole] = useState<"host" | "entrant">("host");
  const [loading, setLoading] = useState(false);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setTimeout(
      () => navigate(role === "host" ? "/en/dashboard" : "/en/public-raffles/live"),
      900,
    );
  }

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Start hosting in minutes — no setup fees, ever."
    >
      <GoogleButton label="Sign up with Google" />

      <div className="my-5 flex items-center gap-3 text-xs text-zinc-600">
        <span className="h-px flex-1 divider-faded" />
        or
        <span className="h-px flex-1 divider-faded" />
      </div>

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
              className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-zinc-500"
            />
            <Input id="name" required placeholder="Jordan Miller" className="pl-11" />
          </div>
        </Field>

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
              placeholder="you@example.com"
              className="pl-11"
            />
          </div>
        </Field>

        <Field label="Password" htmlFor="password" hint="8+ characters">
          <div className="relative">
            <Lock
              strokeWidth={1.5}
              className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-zinc-500"
            />
            <Input
              id="password"
              type="password"
              required
              minLength={8}
              placeholder="••••••••"
              className="pl-11"
            />
          </div>
        </Field>

        <label className="flex cursor-pointer items-start gap-2.5 text-xs leading-relaxed text-zinc-400">
          <input
            type="checkbox"
            required
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-white/20 bg-white/[0.03] accent-[#8b5cf6]"
          />
          I'm 18 or over and agree to the{" "}
          <a href="#" className="text-accent-soft hover:text-white">Terms</a> &amp;{" "}
          <a href="#" className="text-accent-soft hover:text-white">Privacy Policy</a>.
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

      <p className="mt-6 text-center text-sm text-zinc-400">
        Already have an account?{" "}
        <Link to="/en/login" className="font-medium text-accent-soft transition-colors hover:text-white">
          Log in
        </Link>
      </p>
    </AuthLayout>
  );
}
