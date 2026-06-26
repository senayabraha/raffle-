import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { AuroraBackground } from "@/components/ui/AuroraBackground";
import { MarketingNav } from "@/components/layout/MarketingNav";

/** Public layout: aurora bg + floating glass nav + footer. */
export function PublicShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-app">
      <AuroraBackground />
      <MarketingNav />
      <main className="mx-auto max-w-6xl px-5 pt-28 sm:pt-32">{children}</main>

      <footer className="mx-auto max-w-6xl px-5 py-12">
        <div className="h-px divider-faded" />
        <div className="mt-6 flex flex-col items-center justify-between gap-4 text-sm text-ink-subtle sm:flex-row">
          <Link to="/en" className="flex items-center gap-2">
            <div className="grid h-7 w-7 place-items-center rounded-lg bg-accent-gradient">
              <Sparkles strokeWidth={2} className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="font-semibold text-ink">Raffall</span>
            <span>© 2026</span>
          </Link>
          <div className="flex gap-5">
            <Link to="/en/terms" className="transition-colors hover:text-ink">Terms &amp; fees</Link>
            <Link to="/en/privacy" className="transition-colors hover:text-ink">Privacy</Link>
            <Link to="/en/contact" className="transition-colors hover:text-ink">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
