import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { X, Download } from "lucide-react";
import { SpotlightCard } from "@/components/ui/SpotlightCard";
import { CardHeader } from "@/components/dashboard/CardHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  fetchAdminUsers,
  setUserRole,
  setSubscriptionTier,
  exportUserData,
  suspendUser,
  unsuspendUser,
  type AdminUserRow,
} from "@/lib/admin";
import type { Tables } from "@/lib/database.types";

type UserRole = Tables<"profiles">["role"];
type SubscriptionTier = Tables<"profiles">["subscription_tier"];

const ROLE_TONE: Record<string, "live" | "neutral" | "warning" | "info" | "accent"> = {
  admin: "accent",
  host: "info",
  entrant: "neutral",
  both: "live",
};

const SUSPENSION_LABEL: Record<"temporary" | "permanent", string> = {
  temporary: "Temporarily suspended",
  permanent: "Permanently suspended",
};

const ROLES: UserRole[] = ["entrant", "host", "both", "admin"];
const TIERS: SubscriptionTier[] = ["basic", "premium", "pro"];

export default function Users() {
  const [searchParams] = useSearchParams();
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState(() => (searchParams.get("filter") === "hosts" ? "hosts" : "all"));
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<AdminUserRow | null>(null);

  function load() {
    setLoading(true);
    fetchAdminUsers().then((rows) => {
      setUsers(rows);
      setLoading(false);
    });
  }

  useEffect(load, []);

  const roles = useMemo(() => Array.from(new Set(users.map((u) => u.role))), [users]);

  const filtered = users.filter((u) => {
    if (role === "hosts" && u.role !== "host" && u.role !== "both") return false;
    if (role !== "all" && role !== "hosts" && u.role !== role) return false;
    if (!query.trim()) return true;
    const q = query.trim().toLowerCase();
    return u.fullName?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q);
  });

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-ink">Users</h1>
      <p className="mt-1 text-sm text-ink-subtle">
        Most recent 200 registered accounts, for support lookups and role auditing.
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or email"
          className="h-10 min-w-[240px] flex-1 rounded-xl border border-line bg-surface px-3.5 text-sm text-ink placeholder:text-ink-subtle focus-ring"
        />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="h-10 rounded-xl border border-line bg-surface px-3 text-sm text-ink focus-ring"
        >
          <option value="all">All roles</option>
          <option value="hosts">Hosts</option>
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
              <div key={i} className="h-12 animate-pulse rounded-lg bg-surface" />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wide text-ink-subtle">
                  <th className="py-2 pr-4">Name</th>
                  <th className="py-2 pr-4">Email</th>
                  <th className="py-2 pr-4">Role</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Tier</th>
                  <th className="py-2 pr-4">Hosted raffles</th>
                  <th className="py-2 pr-4">Joined</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => (
                  <tr
                    key={u.id}
                    onClick={() => setSelected(u)}
                    className="cursor-pointer border-t border-line text-ink transition-colors hover:bg-surface"
                  >
                    <td className="py-3 pr-4 font-medium text-ink">{u.fullName ?? "—"}</td>
                    <td className="py-3 pr-4">{u.email ?? "—"}</td>
                    <td className="py-3 pr-4">
                      <Badge tone={ROLE_TONE[u.role] ?? "neutral"}>{u.role}</Badge>
                    </td>
                    <td className="py-3 pr-4">
                      <Badge tone={u.status === "suspended" ? "warning" : "live"}>
                        {u.status === "suspended" && u.suspensionType
                          ? SUSPENSION_LABEL[u.suspensionType]
                          : u.status}
                      </Badge>
                    </td>
                    <td className="py-3 pr-4 capitalize">{u.subscriptionTier}</td>
                    <td className="py-3 pr-4">{u.raffleCount}</td>
                    <td className="py-3 pr-4">{new Date(u.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SpotlightCard>

      {selected && (
        <UserDetailModal
          user={selected}
          onClose={() => setSelected(null)}
          onChanged={() => {
            setSelected(null);
            load();
          }}
        />
      )}
    </div>
  );
}

function UserDetailModal({
  user,
  onClose,
  onChanged,
}: {
  user: AdminUserRow;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exported, setExported] = useState<Record<string, unknown> | null>(null);
  const [suspendPanelOpen, setSuspendPanelOpen] = useState(false);
  const [suspendType, setSuspendType] = useState<"temporary" | "permanent">("temporary");
  const [suspendEndsAt, setSuspendEndsAt] = useState("");

  async function run(action: () => Promise<void>) {
    if (!reason.trim()) {
      setError("A reason is required.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await action();
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed.");
    } finally {
      setSubmitting(false);
    }
  }

  async function runExport() {
    setExporting(true);
    setError(null);
    try {
      setExported(await exportUserData(user.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="glass max-h-[85vh] w-full max-w-lg overflow-y-auto p-6"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-ink">{user.fullName ?? "Unnamed user"}</h2>
            <p className="text-xs text-ink-subtle">{user.email ?? "No email on file"}</p>
          </div>
          <button onClick={onClose} className="text-ink-subtle hover:text-ink">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5 space-y-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-ink-subtle">Role</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {ROLES.map((r) => (
                <Button
                  key={r}
                  size="sm"
                  variant={r === user.role ? "primary" : "outline"}
                  disabled={r === user.role || submitting}
                  onClick={() => run(() => setUserRole(user.id, r, reason))}
                >
                  {r}
                </Button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-ink-subtle">
              Subscription tier
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {TIERS.map((t) => (
                <Button
                  key={t}
                  size="sm"
                  variant={t === user.subscriptionTier ? "primary" : "outline"}
                  disabled={t === user.subscriptionTier || submitting}
                  onClick={() => run(() => setSubscriptionTier(user.id, t, reason))}
                >
                  {t}
                </Button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-ink-subtle">
              Account standing
            </p>
            <div className="mt-2">
              {user.status === "suspended" ? (
                <>
                  <p className="text-xs text-ink-subtle">
                    {user.suspensionType ? SUSPENSION_LABEL[user.suspensionType] : "Suspended"}
                    {user.suspensionEndsAt
                      ? ` until ${new Date(user.suspensionEndsAt).toLocaleString()}`
                      : ""}
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={submitting}
                    className="mt-2"
                    onClick={() => run(() => unsuspendUser(user.id, reason))}
                  >
                    Reinstate account
                  </Button>
                  <p className="mt-1 text-xs text-ink-subtle">
                    Their raffles will remain suspended and must be manually unsuspended.
                  </p>
                </>
              ) : (
                <>
                  <Button
                    size="sm"
                    variant={suspendPanelOpen ? "primary" : "outline"}
                    disabled={submitting}
                    onClick={() => setSuspendPanelOpen((v) => !v)}
                  >
                    Suspend account
                  </Button>
                  {suspendPanelOpen && (
                    <div className="mt-3 space-y-3">
                      {user.raffleCount > 0 && (
                        <p className="text-xs text-amber-400">
                          Suspending this host will also temporarily suspend all their active
                          raffles.
                        </p>
                      )}
                      <div className="flex gap-3">
                        <Button
                          size="sm"
                          variant={suspendType === "temporary" ? "primary" : "outline"}
                          onClick={() => setSuspendType("temporary")}
                        >
                          Temporary
                        </Button>
                        <Button
                          size="sm"
                          variant={suspendType === "permanent" ? "primary" : "outline"}
                          onClick={() => setSuspendType("permanent")}
                        >
                          Permanent
                        </Button>
                      </div>
                      {suspendType === "temporary" && (
                        <input
                          type="datetime-local"
                          value={suspendEndsAt}
                          onChange={(e) => setSuspendEndsAt(e.target.value)}
                          className="h-10 w-full rounded-xl border border-line bg-surface px-3.5 text-sm text-ink focus-ring"
                        />
                      )}
                      <Button
                        size="sm"
                        disabled={
                          submitting ||
                          !reason.trim() ||
                          (suspendType === "temporary" && !suspendEndsAt)
                        }
                        onClick={() =>
                          run(() =>
                            suspendUser(
                              user.id,
                              suspendType,
                              reason,
                              suspendType === "temporary"
                                ? new Date(suspendEndsAt).toISOString()
                                : undefined,
                            ),
                          )
                        }
                      >
                        Confirm suspension
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason for any change above (required, recorded in the audit log)"
            rows={2}
            className="w-full resize-none rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-subtle focus-ring"
          />

          {error && <p className="text-sm text-rose-400">{error}</p>}

          <div className="border-t border-line pt-4">
            <Button size="sm" variant="ghost" disabled={exporting} onClick={runExport}>
              <Download className="h-4 w-4" />
              {exporting ? "Exporting…" : "Export subject-access data"}
            </Button>
            {exported && (
              <pre className="mt-3 max-h-48 overflow-auto rounded-xl border border-line bg-black/30 p-3 text-xs text-ink-muted">
                {JSON.stringify(exported, null, 2)}
              </pre>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
