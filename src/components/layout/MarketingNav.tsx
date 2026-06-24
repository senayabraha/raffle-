import { Link, useNavigate } from "react-router-dom";
import { Menu, Ticket, LogOut } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/lib/auth";
import { useDrawer } from "@/lib/drawer";

const baseLinks: { label: string; href?: string; to?: string }[] = [
  { label: "How it works", href: "/en#how" },
  { label: "Marketplace", to: "/en/public-raffles/live" },
  { label: "Pricing", href: "/en#pricing" },
];

export function MarketingNav() {
  const navigate = useNavigate();
  const { session, signOut } = useAuth();
  const { open: openDrawer } = useDrawer();
  // Signed-out visitors go straight to the Host portal, not the entrant
  // login, since landing on the dashboard requires Host-context auth.
  const links = [...baseLinks, { label: "Hosts", to: session ? "/en/dashboard" : "/en/host/login" }];

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
          <Link to="/en" className="text-[15px] font-bold tracking-tight text-white">
            Raffall
          </Link>
        </div>

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
          {session ? (
            <>
              <Link to="/en/tickets">
                <Button variant="ghost" size="sm" className="hidden sm:inline-flex">
                  <Ticket strokeWidth={1.5} className="h-[18px] w-[18px]" />
                  My tickets
                </Button>
              </Link>
              <Link to="/en/dashboard">
                <Button variant="primary" size="sm">
                  Dashboard
                </Button>
              </Link>
              <button
                onClick={handleSignOut}
                title="Sign out"
                className="focus-ring grid h-9 w-9 place-items-center rounded-lg text-zinc-500 transition-colors hover:bg-white/[0.06] hover:text-rose-300"
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
              <Link to="/en/register">
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
