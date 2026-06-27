import { Link, useNavigate } from "react-router-dom";
import { Menu, Ticket, LogOut, ArrowLeftRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { useAuth } from "@/lib/auth";
import { useMode } from "@/lib/mode";
import { useDrawer } from "@/lib/drawer";

const baseLinks: { label: string; href?: string; to?: string }[] = [
  { label: "How it works", to: "/en/host/login" },
  { label: "Marketplace", to: "/en/public-raffles/live" },
  { label: "Pricing", to: "/en/pricing" },
];

export function MarketingNav() {
  const navigate = useNavigate();
  const { session, signOut } = useAuth();
  const { canHost, setMode, switching } = useMode();
  const { open: openDrawer } = useDrawer();
  // One predictable host entry point for everyone: the become-a-host page
  // routes signed-out visitors to sign up, upgrades entrants, and sends
  // existing hosts straight to their dashboard.
  const links = [...baseLinks, { label: "Hosts", to: "/en/become-a-host" }];

  async function handleSignOut() {
    await signOut();
    navigate("/en");
  }

  return (
    <header className="fixed inset-x-0 top-0 z-40 flex justify-center px-4 pt-4">
      <nav className="glass flex w-full max-w-5xl items-center justify-between rounded-2xl px-4 py-2.5 sm:px-5">
        <div className="flex items-center gap-2.5">
          <button
            onClick={openDrawer}
            aria-label="Open menu"
            className="focus-ring grid h-8 w-8 place-items-center rounded-lg bg-accent-gradient text-white shadow-accent-glow transition-all duration-300 hover:brightness-110 active:scale-[0.94]"
          >
            <Menu strokeWidth={2} className="h-4 w-4" />
          </button>
          <Link to="/en" className="text-[15px] font-bold tracking-tight text-ink">
            እድል<span className="text-accent">44</span>
          </Link>
        </div>

        <div className="hidden items-center gap-1 md:flex">
          {links.map((l) =>
            l.to ? (
              <Link
                key={l.label}
                to={l.to}
                className="rounded-lg px-3 py-2 text-sm font-medium text-ink-muted transition-colors duration-300 hover:text-ink"
              >
                {l.label}
              </Link>
            ) : (
              <a
                key={l.label}
                href={l.href}
                className="rounded-lg px-3 py-2 text-sm font-medium text-ink-muted transition-colors duration-300 hover:text-ink"
              >
                {l.label}
              </a>
            ),
          )}
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          {session ? (
            <>
              <Link to="/en/tickets">
                <Button variant="ghost" size="sm" className="hidden sm:inline-flex">
                  <Ticket strokeWidth={1.5} className="h-[18px] w-[18px]" />
                  My tickets
                </Button>
              </Link>
              {canHost ? (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setMode("host")}
                  disabled={switching}
                >
                  <ArrowLeftRight strokeWidth={1.5} className="h-[18px] w-[18px]" />
                  Switch to hosting
                </Button>
              ) : (
                <Link to="/en/become-a-host">
                  <Button variant="primary" size="sm">
                    Host a raffle
                  </Button>
                </Link>
              )}
              <button
                onClick={handleSignOut}
                title="Sign out"
                className="focus-ring grid h-9 w-9 place-items-center rounded-lg text-ink-subtle transition-colors hover:bg-surface-2 hover:text-rose-400"
              >
                <LogOut strokeWidth={1.5} className="h-4 w-4" />
              </button>
            </>
          ) : (
            <>
              <Link to="/en/login">
                <Button variant="ghost" size="sm" className="hidden sm:inline-flex">
                  Log in
                </Button>
              </Link>
              <Link to="/en/host/login">
                <Button variant="primary" size="sm">
                  Host a raffle
                </Button>
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
