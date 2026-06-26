import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./auth";
import type { Tables } from "./database.types";

export type AppMode = "entrant" | "host";

type Role = Tables<"profiles">["role"];

const HOST_ROLES: Role[] = ["host", "both", "admin"];
const ENTRANT_ROLES: Role[] = ["entrant", "both", "admin"];

/** Where each mode's "home" lives. */
const HOME: Record<AppMode, string> = {
  host: "/en/dashboard",
  entrant: "/en/public-raffles/live",
};

/** Entrant-only accounts who tap a host CTA land here to upgrade. */
const HOST_UPSELL = "/en/become-a-host";

interface ModeState {
  /** The active app mode. */
  mode: AppMode;
  /** Account can act as a host (role host | both | admin). */
  canHost: boolean;
  /** Account can act as an entrant (role entrant | both | admin). */
  canEnter: boolean;
  /**
   * Switch mode: persists to the DB, mirrors to the session login-context so
   * the existing route guards stay consistent, then routes to that mode's
   * home. Switching to host without host capability routes to the hosting
   * upsell instead of flipping.
   */
  setMode: (next: AppMode) => Promise<void>;
  /** True while a switch is writing to the DB. */
  switching: boolean;
}

const ModeContext = createContext<ModeState | undefined>(undefined);

function normalize(value: string | null | undefined): AppMode | null {
  return value === "host" || value === "entrant" ? value : null;
}

async function persistMode(userId: string, mode: AppMode) {
  const { supabase } = await import("./supabase");
  await supabase.from("profiles").update({ last_active_mode: mode }).eq("id", userId);
}

/**
 * Mode is deliberately separate from `profile.role` (the account's permanent
 * capability). A `both` account can be *in* entrant mode while still being
 * able to host.
 *
 * For the *current* session the login-context (the portal/switch the user
 * last used, persisted in localStorage) is authoritative, so what's on screen
 * always agrees with the route guards, which also key off login-context.
 * `profiles.last_active_mode` is the *durable* memory: it seeds the mode on a
 * fresh device where there's no local context yet, and we write the active
 * mode back to it so that memory stays current.
 */
export function ModeProvider({ children }: { children: ReactNode }) {
  const { profile, user, loginContext, setLoginContext, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [switching, setSwitching] = useState(false);

  const canHost = profile ? HOST_ROLES.includes(profile.role) : false;
  // Before the profile loads, assume entrant capability so the public
  // browsing experience renders without a flash of "blocked".
  const canEnter = profile ? ENTRANT_ROLES.includes(profile.role) : true;

  let mode: AppMode =
    normalize(loginContext) ?? normalize(profile?.last_active_mode) ?? "entrant";
  // An account that can't host can never be *in* host mode, however stale the
  // stored value is.
  if (mode === "host" && profile && !canHost) mode = "entrant";

  // Keep the durable record in step with the active session mode (covers both
  // password and OAuth logins, where the context is chosen before the profile
  // is in hand). The in-flight guard stops the async write from re-firing
  // before refreshProfile lands.
  const reconciling = useRef(false);
  useEffect(() => {
    if (!user || !profile) return;
    if (mode === profile.last_active_mode) return;
    if (reconciling.current) return;
    reconciling.current = true;
    persistMode(user.id, mode)
      .then(() => refreshProfile())
      .finally(() => {
        reconciling.current = false;
      });
  }, [user, profile, mode, refreshProfile]);

  const setMode = useCallback(
    async (next: AppMode) => {
      // Entrant-only accounts can't enter host mode — send them to the
      // hosting upsell, which can promote them and then switch.
      if (next === "host" && !canHost) {
        navigate(HOST_UPSELL);
        return;
      }
      if (next === mode) {
        navigate(HOME[next]);
        return;
      }

      setSwitching(true);
      try {
        if (user) {
          await persistMode(user.id, next);
          await refreshProfile();
        }
        // Keep the session login-context in lockstep so RequireHostContext /
        // RequireEntrantContext don't bounce the user right back.
        setLoginContext(next);
        navigate(HOME[next]);
      } finally {
        setSwitching(false);
      }
    },
    [mode, canHost, user, refreshProfile, setLoginContext, navigate],
  );

  const value = useMemo<ModeState>(
    () => ({ mode, canHost, canEnter, setMode, switching }),
    [mode, canHost, canEnter, setMode, switching],
  );

  return <ModeContext.Provider value={value}>{children}</ModeContext.Provider>;
}

export function useMode() {
  const ctx = useContext(ModeContext);
  if (!ctx) throw new Error("useMode must be used within a ModeProvider");
  return ctx;
}
