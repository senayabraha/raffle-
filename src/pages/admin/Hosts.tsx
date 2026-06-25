import { useEffect, useState } from "react";
import { SpotlightCard } from "@/components/ui/SpotlightCard";
import { CardHeader } from "@/components/dashboard/CardHeader";
import { Badge } from "@/components/ui/Badge";
import { fetchHostRiskLeaderboard, type HostRiskRow } from "@/lib/admin";

export default function Hosts() {
  const [hosts, setHosts] = useState<HostRiskRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetchHostRiskLeaderboard().then((rows) => {
      if (!active) return;
      setHosts(rows);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-white">Host risk</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Hosts ranked by dispute and compensation rate across their raffles.
      </p>

      <SpotlightCard lift={false} className="mt-6 p-5">
        <CardHeader title={`${hosts.length} hosts`} />
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded-lg bg-white/[0.03]" />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wide text-zinc-500">
                  <th className="py-2 pr-4">Host</th>
                  <th className="py-2 pr-4">Raffles</th>
                  <th className="py-2 pr-4">Disputes</th>
                  <th className="py-2 pr-4">Compensated</th>
                </tr>
              </thead>
              <tbody>
                {hosts.map((h) => (
                  <tr key={h.hostId} className="border-t border-white/[0.06] text-zinc-300">
                    <td className="py-3 pr-4">
                      <p className="font-medium text-white">{h.hostName}</p>
                      <p className="text-xs text-zinc-500">{h.hostEmail ?? "—"}</p>
                    </td>
                    <td className="py-3 pr-4">{h.raffleCount}</td>
                    <td className="py-3 pr-4">
                      {h.disputeCount > 0 ? (
                        <Badge tone="warning">{h.disputeCount}</Badge>
                      ) : (
                        0
                      )}
                    </td>
                    <td className="py-3 pr-4">
                      {h.compensatedCount > 0 ? (
                        <Badge tone="warning">{h.compensatedCount}</Badge>
                      ) : (
                        0
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SpotlightCard>
    </div>
  );
}
