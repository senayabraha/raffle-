import { Link } from "react-router-dom";
import { Compass, ArrowLeft } from "lucide-react";
import { PublicShell } from "@/components/layout/PublicShell";
import { Button } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <PublicShell>
      <div className="grid min-h-[60vh] place-items-center">
        <div className="glass-strong relative max-w-md overflow-hidden p-8 text-center">
          <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-accent/25 blur-3xl" />
          <div className="relative">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-accent-gradient shadow-accent-glow">
              <Compass strokeWidth={1.75} className="h-6 w-6 text-white" />
            </div>
            <h1 className="mt-5 text-2xl font-bold tracking-tightest text-white">
              Page not found
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">
              The link you followed may be broken, or the page may have moved.
            </p>
            <Link to="/en" className="mt-6 inline-block">
              <Button variant="secondary" size="md">
                <ArrowLeft strokeWidth={1.5} className="h-[18px] w-[18px]" />
                Back home
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </PublicShell>
  );
}
