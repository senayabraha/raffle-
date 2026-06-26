import { Link } from "react-router-dom";
import { Hammer, ArrowLeft } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";

/**
 * Lightweight placeholder for authenticated areas that are linked from the
 * sidebar but not yet built (e.g. Settings, Support). Rendering a real route
 * here keeps browser history intact instead of bouncing the user to the
 * landing page via the catch-all redirect.
 */
export default function ComingSoon({ title }: { title: string }) {
  return (
    <AppShell>
      <div className="grid min-h-[60vh] place-items-center">
        <div className="glass-strong relative max-w-md overflow-hidden p-8 text-center">
          <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-accent/25 blur-3xl" />
          <div className="relative">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-accent-gradient shadow-accent-glow">
              <Hammer strokeWidth={1.75} className="h-6 w-6 text-white" />
            </div>
            <h1 className="mt-5 text-2xl font-bold tracking-tightest text-ink">
              {title}
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-ink-muted">
              This area is coming soon. We're still building it — check back
              shortly.
            </p>
            <Link to="/en/dashboard" className="mt-6 inline-block">
              <Button variant="secondary" size="md">
                <ArrowLeft strokeWidth={1.5} className="h-[18px] w-[18px]" />
                Back to dashboard
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
