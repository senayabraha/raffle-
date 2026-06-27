import { useState } from "react";
import { cn } from "@/lib/utils";

type TabKey = "win" | "host";

interface Step {
  number: number;
  illustration: string;
  title: string;
  description: string;
}

const STEPS: Record<TabKey, Step[]> = {
  win: [
    {
      number: 1,
      illustration: "/illustrations/search.png",
      title: "Browse raffles",
      description: "Find a prize you want to win from our live listings.",
    },
    {
      number: 2,
      illustration: "/illustrations/ticket.png",
      title: "Buy tickets",
      description: "Choose how many tickets to enter with — more tickets, better odds.",
    },
    {
      number: 3,
      illustration: "/illustrations/trophy.png",
      title: "Win prizes",
      description: "A transparent automated draw picks the winner fairly.",
    },
  ],
  host: [
    {
      number: 1,
      illustration: "/illustrations/gift.png",
      title: "List a prize",
      description: "Describe your prize, set a ticket price, and go live in minutes.",
    },
    {
      number: 2,
      illustration: "/illustrations/megaphone.png",
      title: "Share your raffle",
      description: "Share your link and sell tickets to your audience.",
    },
    {
      number: 3,
      illustration: "/illustrations/wallet.png",
      title: "Get paid",
      description: "Funds are held in escrow and released to you when your winner confirms.",
    },
  ],
};

function StepCard({ step }: { step: Step }) {
  return (
    <div className="flex items-center gap-5 rounded-2xl bg-surface-2 p-6">
      <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-gradient text-base font-bold text-white">
        {step.number}
      </span>
      <span className="h-12 w-px shrink-0 bg-line" aria-hidden="true" />
      <span className="relative flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-violet-100">
        <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-violet-300" aria-hidden="true" />
        <span className="absolute -bottom-0.5 left-1 h-1.5 w-1.5 rounded-full bg-violet-300" aria-hidden="true" />
        <img
          src={step.illustration}
          alt={step.title}
          className="h-16 w-16 object-contain"
        />
      </span>
      <div>
        <h3 className="text-lg font-bold text-ink">{step.title}</h3>
        <p className="mt-1.5 text-sm text-ink-muted">{step.description}</p>
      </div>
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
          "mt-8 flex flex-col gap-4 text-left transition-opacity duration-300",
          visible ? "opacity-100" : "opacity-0",
        )}
      >
        {steps.map((step) => (
          <StepCard key={step.title} step={step} />
        ))}
      </div>
    </section>
  );
}
