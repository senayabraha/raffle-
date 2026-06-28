import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, Link, Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import { QRCodeCanvas } from "qrcode.react";
import {
  ShieldCheck,
  Trophy,
  ArrowLeft,
  Share2,
  Twitter,
  Facebook,
  Send,
  Link2,
  Gift,
  Check,
  QrCode,
  Download,
  ShieldAlert,
} from "lucide-react";
import { PublicShell } from "@/components/layout/PublicShell";
import { SpotlightCard } from "@/components/ui/SpotlightCard";
import { CountdownPills } from "@/components/ui/Countdown";
import { Button } from "@/components/ui/Button";
import { TicketSelector } from "@/components/raffle/TicketSelector";
import { type MarketplaceRaffle } from "@/data/marketplace";
import { fetchRaffleBySlug, fetchRaffleEntrants, type RaffleEntrant } from "@/lib/raffles";
import { formatCompact, formatCurrency, cn } from "@/lib/utils";

function RecentEntrantTicker({ entrants }: { entrants: RaffleEntrant[] }) {
  const [idx, setIdx] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (entrants.length <= 1) return;
    const id = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIdx((i) => (i + 1) % entrants.length);
        setVisible(true);
      }, 400);
    }, 3500);
    return () => clearInterval(id);
  }, [entrants.length]);

  const e = entrants[idx];
  if (!e) return null;

  return (
    <div
      className="flex items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3 transition-opacity duration-300"
      style={{ opacity: visible ? 1 : 0 }}
    >
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-accent-gradient text-[10px] font-bold text-white">
        {e.initials}
      </span>
      <p className="text-sm text-ink">
        <span className="font-semibold">{e.name.split(/\s+/)[0]}</span>
        {" just entered"}
        <span className="ml-1 text-ink-subtle text-xs">· moments ago</span>
      </p>
    </div>
  );
}

export default function RaffleDetail() {
  const { slug } = useParams();
  const [raffle, setRaffle] = useState<MarketplaceRaffle | null | undefined>(
    undefined,
  );
  const [resolving, setResolving] = useState(true);
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [entrants, setEntrants] = useState<RaffleEntrant[]>([]);
  const [qty, setQty] = useState(5);
  const qrRef = useRef<HTMLDivElement>(null);
  const ticketSectionRef = useRef<HTMLDivElement>(null);
  const [showSticky, setShowSticky] = useState(false);

  const shareUrl =
    typeof window !== "undefined" ? window.location.href : "";

  function shareTo(network: "x" | "facebook" | "telegram") {
    const text = raffle ? `Check out "${raffle.title}" on እድል44` : "Check out this raffle on እድል44";
    const urls: Record<typeof network, string> = {
      x: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
      telegram: `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(text)}`,
    };
    window.open(urls[network], "_blank", "noopener,noreferrer");
  }

  async function copyLink() {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function downloadQr() {
    const canvas = qrRef.current?.querySelector("canvas");
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `${raffle?.slug ?? "raffle"}-qr.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  const shareLinks = [
    { icon: Twitter, label: "X", onClick: () => shareTo("x") },
    { icon: Facebook, label: "Facebook", onClick: () => shareTo("facebook") },
    { icon: Send, label: "Telegram", onClick: () => shareTo("telegram") },
    { icon: copied ? Check : Link2, label: copied ? "Copied!" : "Copy link", onClick: copyLink },
  ];

  // Resolve the raffle from the database by slug.
  useEffect(() => {
    if (!slug) return;
    let active = true;
    setResolving(true);
    fetchRaffleBySlug(slug).then((row) => {
      if (!active) return;
      setRaffle(row);
      setResolving(false);
    });
    return () => {
      active = false;
    };
  }, [slug]);

  // Load the recent entries feed once the raffle has resolved.
  useEffect(() => {
    if (!raffle) return;
    let active = true;
    fetchRaffleEntrants(raffle.id).then((rows) => {
      if (active) setEntrants(rows);
    });
    return () => {
      active = false;
    };
  }, [raffle]);

  // Toggle the mobile sticky CTA when the ticket panel scrolls out of view.
  useEffect(() => {
    const el = ticketSectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setShowSticky(!entry.isIntersecting),
      { threshold: 0 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const free = useMemo(() => {
    if (!raffle) return 0;
    let f = 0;
    for (const b of raffle.bundles) {
      if (qty >= b.qty) f = Math.max(f, Math.floor(qty / b.qty) * b.free);
    }
    return f;
  }, [qty, raffle]);

  const total = qty * (raffle?.ticketPrice ?? 0);
  const totalTickets = qty + free;

  if (resolving) {
    return (
      <PublicShell>
        <div className="grid min-h-[50vh] place-items-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-line border-t-accent" />
        </div>
      </PublicShell>
    );
  }

  if (!raffle) return <Navigate to="/en/public-raffles/live" replace />;

  const pct = Math.min((raffle.sold / raffle.cap) * 100, 100);
  const Icon = raffle.icon;

  return (
    <PublicShell>
      <Link
        to="/en/public-raffles/live"
        className="mb-5 inline-flex items-center gap-1.5 text-sm text-ink-muted transition-colors hover:text-ink"
      >
        <ArrowLeft strokeWidth={1.5} className="h-4 w-4" />
        Back to marketplace
      </Link>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* ---- Left: prize details ---- */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="space-y-6 lg:col-span-2"
        >
          {/* Cover */}
          <div className="relative aspect-[16/9] overflow-hidden rounded-3xl border border-line">
            {raffle.image ? (
              <img
                src={raffle.image}
                alt={raffle.title}
                loading="lazy"
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : (
              <div className={cn("absolute inset-0 bg-gradient-to-br", raffle.gradient)} />
            )}
            <div className="absolute inset-0 bg-app/20" />
            {!raffle.image && (
              <Icon
                strokeWidth={1}
                className="absolute left-1/2 top-1/2 h-28 w-28 -translate-x-1/2 -translate-y-1/2 text-ink/80 drop-shadow-xl"
              />
            )}
          </div>

          {/* Prize info */}
          <SpotlightCard className="p-6" lift={false}>
            <span className="text-xs uppercase tracking-wider text-ink-subtle">
              {raffle.category}
            </span>
            <h1 className="mt-1.5 text-3xl font-bold tracking-tightest text-ink sm:text-4xl">
              {raffle.title}
            </h1>

            <hr className="my-5 border-line" />
            <p className="text-base leading-relaxed text-ink-muted">
              {raffle.description}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs text-ink-muted">
                <span className="grid h-5 w-5 place-items-center rounded-full bg-accent-gradient text-[9px] font-bold text-white">
                  {raffle.hostInitials}
                </span>
                {raffle.host}
              </span>
              {raffle.hostVerified && (
                <div
                  title="Identity verified by እድል44"
                  className="flex items-center gap-1 rounded-full bg-blue-500/15 px-2 py-0.5"
                >
                  <Check strokeWidth={2.5} className="h-3 w-3 text-blue-400" />
                  <span className="text-[11px] font-semibold text-blue-400">Verified</span>
                </div>
              )}
              {raffle.bundles.map((b) => (
                <span
                  key={b.qty}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 text-xs text-ink"
                >
                  <Gift className="h-3.5 w-3.5 text-accent-soft" />
                  Buy {b.qty}, get {b.free} free
                </span>
              ))}
            </div>
          </SpotlightCard>

          {/* Recent entries */}
          {entrants.length > 0 && (
            <RecentEntrantTicker entrants={entrants} />
          )}
        </motion.div>

        {/* ---- Right: sticky purchase panel ---- */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="lg:col-span-1"
        >
          <div className="space-y-4 lg:sticky lg:top-28">
            {/* Countdown + progress */}
            <div className="glass-strong p-5">
              <p className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-ink-muted">
                <Trophy strokeWidth={1.5} className="h-4 w-4 text-accent-soft" />
                Draw {raffle.status === "ended" ? "closed" : "in"}
              </p>
              <CountdownPills drawDate={raffle.drawDate} />

              <div className="mt-5">
                <div className="h-2 overflow-hidden rounded-full bg-surface-2">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                    className="h-full rounded-full bg-accent-gradient"
                  />
                </div>
                <div className="mt-2 flex justify-between text-xs text-ink-muted">
                  <span>
                    <span className="font-semibold text-ink tabular-nums">
                      {formatCompact(raffle.sold)}
                    </span>{" "}
                    sold
                  </span>
                  <span className="tabular-nums">
                    {formatCompact(raffle.cap - raffle.sold)} remaining
                  </span>
                </div>
              </div>
            </div>

            {/* Ticket selector */}
            {raffle.suspensionStatus === "active" ? (
              <div ref={ticketSectionRef}>
                <TicketSelector raffle={raffle} qty={qty} onQtyChange={setQty} />
              </div>
            ) : (
              <div className="glass-strong flex items-start gap-3 p-5">
                <ShieldAlert strokeWidth={1.5} className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
                <div>
                  <p className="text-sm font-semibold text-ink">
                    {raffle.suspensionStatus === "permanent"
                      ? "This raffle has been closed."
                      : "This raffle has been temporarily paused."}
                  </p>
                  <p className="mt-1 text-xs text-ink-subtle">
                    {raffle.suspensionStatus === "permanent"
                      ? "Ticket sales are no longer available for this raffle."
                      : "Check back later — ticket sales will resume once the pause is lifted."}
                  </p>
                </div>
              </div>
            )}

            {/* Share */}
            <div className="glass p-5">
              <p className="inline-flex items-center gap-1.5 text-sm font-medium text-ink">
                <Share2 strokeWidth={1.5} className="h-4 w-4 text-accent-soft" />
                Share this raffle
              </p>
              <p className="mt-1 text-xs text-ink-subtle">
                Send your link or scan the QR code to enter from any device.
              </p>
              <div className="mt-3 grid grid-cols-4 gap-2">
                {shareLinks.map((s) => (
                  <button
                    key={s.label}
                    type="button"
                    title={s.label}
                    onClick={s.onClick}
                    className="focus-ring grid h-11 place-items-center rounded-xl border border-line bg-surface text-ink transition-all duration-300 hover:-translate-y-0.5 hover:border-accent/40 hover:text-accent-soft active:scale-95"
                  >
                    <s.icon strokeWidth={1.5} className="h-[18px] w-[18px]" />
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setShowQr((v) => !v)}
                className="focus-ring mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-line bg-surface py-2.5 text-xs font-medium text-ink transition-all duration-300 hover:border-accent/40 hover:text-accent-soft"
              >
                <QrCode strokeWidth={1.5} className="h-4 w-4" />
                {showQr ? "Hide QR code" : "Show QR code"}
              </button>

              {showQr && (
                <div
                  ref={qrRef}
                  className="mt-3 flex flex-col items-center gap-3 rounded-xl border border-line bg-white p-4"
                >
                  <QRCodeCanvas value={shareUrl} size={160} includeMargin />
                  <button
                    type="button"
                    onClick={downloadQr}
                    className="focus-ring inline-flex items-center gap-1.5 text-xs font-medium text-zinc-700 transition-colors hover:text-obsidian"
                  >
                    <Download strokeWidth={1.5} className="h-3.5 w-3.5" />
                    Download
                  </button>
                </div>
              )}
            </div>

            {/* Guarantee */}
            <div className="glass flex items-start gap-3 p-4">
              <ShieldCheck strokeWidth={1.5} className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
              <p className="text-xs leading-relaxed text-ink-muted">
                <span className="font-semibold text-ink">እድል<span className="text-accent">44</span> Guarantee:</span>{" "}
                the host has 7 days after the draw to confirm delivery. If they
                don't, you receive 75% of ticket revenue back, paid by the
                platform — automatically.
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Sticky mobile CTA */}
      <div
        className={cn(
          "fixed bottom-0 left-0 right-0 z-50 lg:hidden",
          "border-t border-line bg-app/90 backdrop-blur-md px-4 py-3",
          "flex items-center gap-3 transition-transform duration-300",
          showSticky ? "translate-y-0" : "translate-y-full"
        )}
      >
        <div className="flex-1 min-w-0">
          <p className="text-[11px] text-ink-subtle">
            {totalTickets} ticket{totalTickets !== 1 ? "s" : ""}
            {free > 0 && (
              <span className="text-emerald-400"> (+{free} free)</span>
            )}
          </p>
          <p className="text-base font-bold tabular-nums text-ink">
            {formatCurrency(total)}
          </p>
        </div>
        <Button
          variant="primary"
          size="md"
          onClick={() => {
            ticketSectionRef.current?.scrollIntoView({ behavior: "smooth" });
          }}
        >
          Enter raffle →
        </Button>
      </div>
    </PublicShell>
  );
}
