import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Sparkles, ShieldCheck, Zap } from "lucide-react";
import { AuroraBackground } from "@/components/ui/AuroraBackground";
import { useSiteScale } from "@/hooks/useSiteScale";

const proofs = [
  { icon: ShieldCheck, text: "Escrow-protected payouts" },
  { icon: Zap, text: "Automated, auditable draws" },
];

/** Split-screen auth shell: brand panel + glass form card. */
export function AuthLayout({
  children,
  title,
  subtitle,
}: {
  children: ReactNode;
  title: string;
  subtitle: string;
}) {
  const { currentScale } = useSiteScale();

  return (
    <div className="relative grid min-h-screen lg:grid-cols-2" style={{ zoom: currentScale }}>
      <AuroraBackground />

      {/* Brand / proof panel */}
      <div className="relative hidden flex-col justify-between p-12 lg:flex">
        <Link to="/en" className="flex items-center gap-2.5">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-accent-gradient shadow-accent-glow">
            <Sparkles strokeWidth={2} className="h-[18px] w-[18px] text-white" />
          </div>
          <span className="text-[15px] font-bold tracking-tight text-ink">Raffall</span>
        </Link>

        <div>
          <h2 className="max-w-md text-4xl font-bold leading-tight tracking-tightest text-ink">
            The premium home for{" "}
            <span className="text-gradient">prize competitions</span>.
          </h2>
          <ul className="mt-8 space-y-3">
            {proofs.map((p) => (
              <li key={p.text} className="flex items-center gap-3 text-sm text-ink">
                <span className="grid h-9 w-9 place-items-center rounded-xl border border-line bg-surface text-accent-soft">
                  <p.icon strokeWidth={1.5} className="h-[18px] w-[18px]" />
                </span>
                {p.text}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Form card */}
      <div className="relative flex items-center justify-center px-5 py-12 sm:px-8">
        <div className="w-full max-w-sm">
          <Link
            to="/en"
            className="mb-8 flex items-center gap-2.5 lg:hidden"
          >
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-accent-gradient shadow-accent-glow">
              <Sparkles strokeWidth={2} className="h-[18px] w-[18px] text-white" />
            </div>
            <span className="text-[15px] font-bold tracking-tight text-ink">Raffall</span>
          </Link>

          <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            {title}
          </h1>
          <p className="mt-2 text-sm text-ink-muted">{subtitle}</p>

          <div className="mt-7">{children}</div>
        </div>
      </div>
    </div>
  );
}
