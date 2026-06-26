import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import { Search, Ticket, Trophy, Gift, Megaphone, Wallet, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type TabKey = "win" | "host";

interface Step {
  number: number;
  icon: LucideIcon;
  title: string;
  description: string;
}

const STEPS: Record<TabKey, Step[]> = {
  win: [
    {
      number: 1,
      icon: Search,
      title: "Browse raffles",
      description: "Find a prize you want to win from our live listings.",
    },
    {
      number: 2,
      icon: Ticket,
      title: "Buy tickets",
      description: "Choose how many tickets to enter with — more tickets, better odds.",
    },
    {
      number: 3,
      icon: Trophy,
      title: "Win prizes",
      description: "A transparent automated draw picks the winner fairly.",
    },
  ],
  host: [
    {
      number: 1,
      icon: Gift,
      title: "List a prize",
      description: "Describe your prize, set a ticket price, and go live in minutes.",
    },
    {
      number: 2,
      icon: Megaphone,
      title: "Share your raffle",
      description: "Share your link and sell tickets to your audience.",
    },
    {
      number: 3,
      icon: Wallet,
      title: "Get paid",
      description: "Funds are held in escrow and released to you when your winner confirms.",
    },
  ],
};

function StepCard({ step }: { step: Step }) {
  const Icon = step.icon;
  return (
    <div className="rounded-2xl bg-surface-2 p-6">
      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-accent-gradient text-xs font-bold text-white">
        {step.number}
      </span>
      <Icon strokeWidth={1.5} className="mt-3 h-7 w-7 text-accent-deep dark:text-accent-soft" />
      <h3 className="mt-3 text-base font-bold text-ink">{step.title}</h3>
      <p className="mt-1.5 text-sm text-ink-muted">{step.description}</p>
    </div>
  );
}

export function HowItWorks() {
  const [activeTab, setActiveTab] = useState<TabKey>("win");
  const [visible, setVisible] = useState(true);

  function handleTabChange(tab: TabKey) {
    if (tab === activeTab) return;
    setVisible(false);
    setTimeout(() => {
      setActiveTab(tab);
      setVisible(true);
    }, 300);
  }

  const steps = STEPS[activeTab];

  return (
    <section className="mx-auto max-w-5xl px-5 py-10">
      <div className="text-center">
        <h2 className="text-2xl font-bold tracking-tightest text-ink sm:text-3xl">How it works</h2>
        <p className="mt-2 text-ink-muted">Simple. Transparent. Fair.</p>

        <div className="mt-6 inline-flex rounded-xl bg-surface-2 p-1">
          <button
            type="button"
            onClick={() => handleTabChange("win")}
            className={cn(
              "rounded-lg px-4 py-2 text-sm font-semibold transition-all duration-300",
              activeTab === "win"
                ? "bg-accent-gradient text-white shadow-accent-glow"
                : "text-ink-muted hover:text-ink",
            )}
          >
            I want to win
          </button>
          <button
            type="button"
            onClick={() => handleTabChange("host")}
            className={cn(
              "rounded-lg px-4 py-2 text-sm font-semibold transition-all duration-300",
              activeTab === "host"
                ? "bg-accent-gradient text-white shadow-accent-glow"
                : "text-ink-muted hover:text-ink",
            )}
          >
            I want to host
          </button>
        </div>
      </div>

      <div
        className={cn(
          "mt-8 grid grid-cols-1 gap-6 text-left transition-opacity duration-300 sm:grid-cols-3 sm:gap-4",
          visible ? "opacity-100" : "opacity-0",
        )}
      >
        {steps.map((step, i) => (
          <div key={step.title} className="relative">
            <StepCard step={step} />
            {i < steps.length - 1 && (
              <ChevronRight
                strokeWidth={1.5}
                className="absolute -right-2 top-10 hidden h-5 w-5 -translate-y-1/2 text-ink-subtle sm:block"
              />
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
