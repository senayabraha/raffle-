import { useState } from "react";
import { Loader2, AlertCircle, CheckCircle2, User, Mail, Lock } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PublicShell } from "@/components/layout/PublicShell";
import { SpotlightCard } from "@/components/ui/SpotlightCard";
import { useMode } from "@/lib/mode";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Form";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

type Status = { kind: "idle" | "success" | "error"; message?: string };

function StatusNote({ status }: { status: Status }) {
  if (status.kind === "idle") return null;
  return (
    <div
      className={
        status.kind === "success"
          ? "flex items-start gap-2 rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-3 text-sm text-emerald-200"
          : "flex items-start gap-2 rounded-xl border border-rose-400/30 bg-rose-400/10 p-3 text-sm text-rose-200"
      }
    >
      {status.kind === "success" ? (
        <CheckCircle2 strokeWidth={1.5} className="mt-0.5 h-4 w-4 shrink-0" />
      ) : (
        <AlertCircle strokeWidth={1.5} className="mt-0.5 h-4 w-4 shrink-0" />
      )}
      {status.message}
    </div>
  );
}

function ProfileSection() {
  const { profile, refreshProfile } = useAuth();
  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setLoading(true);
    setStatus({ kind: "idle" });
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName.trim() })
      .eq("id", profile.id);
    setLoading(false);
    if (error) {
      setStatus({ kind: "error", message: error.message });
      return;
    }
    await refreshProfile();
    setStatus({ kind: "success", message: "Profile updated." });
  }

  return (
    <SpotlightCard className="p-6">
      <div className="flex items-center gap-3">
        <div className="grid h-9 w-9 place-items-center rounded-xl border border-accent/30 bg-accent/10 text-accent-soft">
          <User strokeWidth={1.5} className="h-[18px] w-[18px]" />
        </div>
        <h2 className="text-base font-semibold tracking-tight text-ink">Profile</h2>
      </div>
      <form onSubmit={submit} className="mt-5 space-y-4">
        <Field label="Full name" htmlFor="full_name">
          <Input
            id="full_name"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Jordan Miller"
          />
        </Field>
        <StatusNote status={status} />
        <Button type="submit" variant="secondary" size="md" disabled={loading}>
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          Save changes
        </Button>
      </form>
    </SpotlightCard>
  );
}

function EmailSection() {
  const { user } = useAuth();
  const [email, setEmail] = useState(user?.email ?? "");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setStatus({ kind: "idle" });
    const { error } = await supabase.auth.updateUser({ email });
    setLoading(false);
    if (error) {
      setStatus({ kind: "error", message: error.message });
      return;
    }
    setStatus({
      kind: "success",
      message: "Check your inbox to confirm the new email address.",
    });
  }

  return (
    <SpotlightCard className="p-6">
      <div className="flex items-center gap-3">
        <div className="grid h-9 w-9 place-items-center rounded-xl border border-accent/30 bg-accent/10 text-accent-soft">
          <Mail strokeWidth={1.5} className="h-[18px] w-[18px]" />
        </div>
        <h2 className="text-base font-semibold tracking-tight text-ink">Email</h2>
      </div>
      <form onSubmit={submit} className="mt-5 space-y-4">
        <Field label="Email address" htmlFor="email">
          <Input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
        <StatusNote status={status} />
        <Button type="submit" variant="secondary" size="md" disabled={loading}>
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          Update email
        </Button>
      </form>
    </SpotlightCard>
  );
}

function PasswordSection() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setStatus({ kind: "error", message: "Passwords don't match." });
      return;
    }
    setLoading(true);
    setStatus({ kind: "idle" });
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      setStatus({ kind: "error", message: error.message });
      return;
    }
    setPassword("");
    setConfirm("");
    setStatus({ kind: "success", message: "Password updated." });
  }

  return (
    <SpotlightCard className="p-6">
      <div className="flex items-center gap-3">
        <div className="grid h-9 w-9 place-items-center rounded-xl border border-accent/30 bg-accent/10 text-accent-soft">
          <Lock strokeWidth={1.5} className="h-[18px] w-[18px]" />
        </div>
        <h2 className="text-base font-semibold tracking-tight text-ink">Password</h2>
      </div>
      <form onSubmit={submit} className="mt-5 space-y-4">
        <Field label="New password" htmlFor="new_password" hint="8+ characters">
          <Input
            id="new_password"
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </Field>
        <Field label="Confirm new password" htmlFor="confirm_password">
          <Input
            id="confirm_password"
            type="password"
            required
            minLength={8}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="••••••••"
          />
        </Field>
        <StatusNote status={status} />
        <Button type="submit" variant="secondary" size="md" disabled={loading}>
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          Update password
        </Button>
      </form>
    </SpotlightCard>
  );
}

export default function Account() {
  // Account is shared by both modes — render it under whichever shell matches
  // the user's current mode so the surrounding nav stays consistent.
  const { mode } = useMode();
  const Shell = mode === "host" ? AppShell : PublicShell;
  return (
    <Shell>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tightest text-ink">
          Account settings
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          Manage your profile, email and password.
        </p>
      </div>
      <div className="grid max-w-xl gap-5">
        <ProfileSection />
        <EmailSection />
        <PasswordSection />
      </div>
    </Shell>
  );
}
