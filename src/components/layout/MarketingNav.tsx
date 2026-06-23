import { Link } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";

const links: { label: string; href?: string; to?: string }[] = [
  { label: "How it works", href: "/en#how" },
  { label: "Marketplace", to: "/en/public-raffles/live" },
  { label: "Pricing", href: "/en#pricing" },
  { label: "Hosts", to: "/en/dashboard" },
];

export function MarketingNav() {
  return (
    <header className="fixed inset-x-0 top-0 z-40 flex justify-center px-4 pt-4">
      <nav className="glass flex w-full max-w-5xl items-center justify-between rounded-2xl px-4 py-2.5 sm:px-5">
        <Link to="/en" className="flex items-center gap-2.5">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-accent-gradient shadow-accent-glow">
            <Sparkles strokeWidth={2} className="h-4 w-4 text-white" />
          </div>
          <span className="text-[15px] font-bold tracking-tight text-white">
            Raffall
          </span>
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {links.map((l) =>
            l.to ? (
              <Link
                key={l.label}
                to={l.to}
                className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-400 transition-colors duration-300 hover:text-white"
              >
                {l.label}
              </Link>
            ) : (
              <a
                key={l.label}
                href={l.href}
                className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-400 transition-colors duration-300 hover:text-white"
              >
                {l.label}
              </a>
            ),
          )}
        </div>

        <div className="flex items-center gap-2">
          <Link to="/en/login">
            <Button variant="ghost" size="sm" className="hidden sm:inline-flex">
              Log in
            </Button>
          </Link>
          <Link to="/en/register">
            <Button variant="primary" size="sm">
              Host a raffle
            </Button>
          </Link>
        </div>
      </nav>
    </header>
  );
}
