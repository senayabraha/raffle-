import { useEffect, useRef, useState } from "react";
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
} from "lucide-react";
import { PublicShell } from "@/components/layout/PublicShell";
import { SpotlightCard } from "@/components/ui/SpotlightCard";
import { CountdownPills } from "@/components/ui/Countdown";
import { TicketSelector } from "@/components/raffle/TicketSelector";
import { type MarketplaceRaffle } from "@/data/marketplace";
import { fetchRaffleBySlug } from "@/lib/raffles";
import { formatCompact, cn } from "@/lib/utils";

export default function RaffleDetail() {
  const { slug } = useParams();
  const [raffle, setRaffle] = useState<MarketplaceRaffle | null | undefined>(
    undefined,
  );
  const [resolving, setResolving] = useState(true);
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);

  const shareUrl =
    typeof window !== "undefined" ? window.location.href : "";

  function shareTo(network: "x" | "facebook" | "telegram") {
    const text = raffle ? `Check out "${raffle.title}" on Raffall` : "Check out this raffle on Raffall";
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

  if (resolving) {
    return (
      <PublicShell>
        <div className="grid min-h-[50vh] place-items-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-accent" />
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
        className="mb-5 inline-flex items-center gap-1.5 text-sm text-zinc-400 transition-colors hover:text-white"
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
          <div className="relative aspect-[16/9] overflow-hidden rounded-3xl border border-white/10">
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
            <div className="absolute inset-0 bg-obsidian/20" />
            {!raffle.image && (
              <Icon
                strokeWidth={1}
                className="absolute left-1/2 top-1/2 h-28 w-28 -translate-x-1/2 -translate-y-1/2 text-white/80 drop-shadow-xl"
              />
            )}
          </div>

          {/* Title + host */}
          <div>
            <span className="text-xs uppercase tracking-wider text-zinc-500">
              {raffle.category}
            </span>
            <h1 className="mt-1.5 text-3xl font-bold tracking-tightest text-white sm:text-4xl">
              {raffle.title}
            </h1>
            <div className="mt-4 flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-accent-gradient text-xs font-bold text-white">
                {raffle.hostInitials}
              </span>
              <div className="text-sm">
                <p className="font-semibold text-white">{raffle.host}</p>
              </div>
            </div>
          </div>

          {/* About */}
          <SpotlightCard className="p-6" lift={false}>
            <h2 className="text-[15px] font-semibold tracking-tight text-white">
              About this prize
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">
              {raffle.description}
            </p>
            {raffle.bundles.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {raffle.bundles.map((b) => (
                  <span
                    key={b.qty}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-zinc-300"
                  >
                    <Gift className="h-3.5 w-3.5 text-accent-soft" />
                    Buy {b.qty}, get {b.free} free
                  </span>
                ))}
              </div>
            )}
          </SpotlightCard>
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
              <p className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-zinc-400">
                <Trophy strokeWidth={1.5} className="h-4 w-4 text-accent-soft" />
                Draw {raffle.status === "ended" ? "closed" : "in"}
              </p>
              <CountdownPills drawDate={raffle.drawDate} />

              <div className="mt-5">
                <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                    className="h-full rounded-full bg-accent-gradient"
                  />
                </div>
                <div className="mt-2 flex justify-between text-xs text-zinc-400">
                  <span>
                    <span className="font-semibold text-white tabular-nums">
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
            <TicketSelector raffle={raffle} />

            {/* Share */}
            <div className="glass p-5">
              <p className="inline-flex items-center gap-1.5 text-sm font-medium text-white">
                <Share2 strokeWidth={1.5} className="h-4 w-4 text-accent-soft" />
                Share this raffle
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                Send your link or scan the QR code to enter from any device.
              </p>
              <div className="mt-3 grid grid-cols-4 gap-2">
                {shareLinks.map((s) => (
                  <button
                    key={s.label}
                    type="button"
                    title={s.label}
                    onClick={s.onClick}
                    className="focus-ring grid h-11 place-items-center rounded-xl border border-white/10 bg-white/[0.03] text-zinc-300 transition-all duration-300 hover:-translate-y-0.5 hover:border-accent/40 hover:text-accent-soft active:scale-95"
                  >
                    <s.icon strokeWidth={1.5} className="h-[18px] w-[18px]" />
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setShowQr((v) => !v)}
                className="focus-ring mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] py-2.5 text-xs font-medium text-zinc-300 transition-all duration-300 hover:border-accent/40 hover:text-accent-soft"
              >
                <QrCode strokeWidth={1.5} className="h-4 w-4" />
                {showQr ? "Hide QR code" : "Show QR code"}
              </button>

              {showQr && (
                <div
                  ref={qrRef}
                  className="mt-3 flex flex-col items-center gap-3 rounded-xl border border-white/10 bg-white p-4"
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
              <p className="text-xs leading-relaxed text-zinc-400">
                <span className="font-semibold text-zinc-200">Raffall Guarantee:</span>{" "}
                the host has 7 days after the draw to confirm delivery. If they
                don't, you receive 75% of ticket revenue back, paid by the
                platform — automatically.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </PublicShell>
  );
}
