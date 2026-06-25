import { useEffect, useMemo, useState } from "react";
import { SpotlightCard } from "@/components/ui/SpotlightCard";
import { CardHeader } from "@/components/dashboard/CardHeader";
import { Badge } from "@/components/ui/Badge";
import { fetchAdminUsers, type AdminUserRow } from "@/lib/admin";

const ROLE_TONE: Record<string, "live" | "neutral" | "warning" | "info" | "accent"> = {
  admin: "accent",
  host: "info",
  entrant: "neutral",
  both: "live",
};

export default function Users() {
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState("all");
  const [query, setQuery] = useState("");

  useEffect(() => {
    let active = true;
    fetchAdminUsers().then((rows) => {
      if (!active) return;
      setUsers(rows);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  const roles = useMemo(() => Array.from(new Set(users.map((u) => u.role))), [users]);

  const filtered = users.filter((u) => {
    if (role !== "all" && u.role !== role) return false;
    if (!query.trim()) return true;
    const q = query.trim().toLowerCase();
    return u.fullName?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q);
  });

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-white">Users</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Most recent 200 registered accounts, for support lookups and role auditing.
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or email"
          className="h-10 min-w-[240px] flex-1 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 text-sm text-white placeholder:text-zinc-500 focus-ring"
        />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="h-10 rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm text-white focus-ring"
        >
          <option value="all">All roles</option>
          {roles.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>

      <SpotlightCard lift={false} className="mt-6 p-5">
        <CardHeader title={`${filtered.length} users`} />
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
                  <th className="py-2 pr-4">Name</th>
                  <th className="py-2 pr-4">Email</th>
                  <th className="py-2 pr-4">Role</th>
                  <th className="py-2 pr-4">Tier</th>
                  <th className="py-2 pr-4">Joined</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => (
                  <tr key={u.id} className="border-t border-white/[0.06] text-zinc-300">
                    <td className="py-3 pr-4 font-medium text-white">{u.fullName ?? "—"}</td>
                    <td className="py-3 pr-4">{u.email ?? "—"}</td>
                    <td className="py-3 pr-4">
                      <Badge tone={ROLE_TONE[u.role] ?? "neutral"}>{u.role}</Badge>
                    </td>
                    <td className="py-3 pr-4 capitalize">{u.subscriptionTier}</td>
                    <td className="py-3 pr-4">{new Date(u.createdAt).toLocaleDateString()}</td>
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
