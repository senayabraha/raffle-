import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Session, SupabaseClient, User } from "@supabase/supabase-js";
import type { Database, Tables } from "./database.types";

type Profile = Tables<"profiles">;
type Client = SupabaseClient<Database>;
export type LoginContext = "host" | "entrant";

/**
 * Which login surface the current session was established through. This is
 * deliberately separate from `profile.role` (the account's permanent type):
 * a Host account that signs in from the public Entrant login must still be
 * routed through the entrant flow, and only the dedicated Host login portal
 * may land a session on the Host dashboard. Persisted so it survives reloads
 * for the lifetime of the session, and cleared on sign-out.
 */
const LOGIN_CONTEXT_KEY = "raffall.loginContext";

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  loginContext: LoginContext | null;
  setLoginContext: (context: LoginContext) => void;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

async function fetchProfile(client: Client, userId: string): Promise<Profile | null> {
  const { data } = await client
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
  return data;
}

/**
 * Supabase's underlying `fetch` has no built-in timeout, so a stalled (not
 * failed) connection — common on flaky mobile/carrier networks — never
 * resolves AND never rejects, which would leave `loading` stuck true
 * forever even with a `.catch()` on the outer chain. Racing against a
 * timeout turns a silent hang into a rejection the `.catch()` can handle.
 */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Timed out after ${ms}ms`)), ms),
    ),
  ]);
}

/**
 * The Supabase SDK (~55KB gzip) is dynamically imported here instead of
 * statically, so unauthenticated routes like the public landing page don't
 * pay for it before they can render. The auth state simply resolves a beat
 * later once the chunk and session check land.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [loginContext, setLoginContextState] = useState<LoginContext | null>(
    () => (localStorage.getItem(LOGIN_CONTEXT_KEY) as LoginContext | null) ?? null,
  );
  const clientRef = useRef<Client | null>(null);

  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;

    import("./supabase")
      .then(async ({ supabase }) => {
        if (!active) return;
        clientRef.current = supabase;

        const { data } = await withTimeout(supabase.auth.getSession(), 8000);
        if (!active) return;
        setSession(data.session);
        if (data.session?.user) {
          setProfile(await withTimeout(fetchProfile(supabase, data.session.user.id), 8000));
        }
        setLoading(false);

        const { data: sub } = supabase.auth.onAuthStateChange(async (_event, next) => {
          if (!active) return;
          setSession(next);
          setProfile(next?.user ? await fetchProfile(supabase, next.user.id) : null);
        });
        unsubscribe = () => sub.subscription.unsubscribe();
      })
      .catch((err) => {
        // A dropped connection while fetching the Supabase chunk or checking
        // the session (common on flaky mobile networks) must not leave
        // `loading` stuck true forever — fall back to "signed out" so the
        // app can render instead of spinning indefinitely.
        if (!active) return;
        console.error("Failed to initialize auth session", err);
        setSession(null);
        setProfile(null);
        setLoading(false);
      });

    return () => {
      active = false;
      unsubscribe?.();
    };
  }, []);

  const value: AuthState = {
    session,
    user: session?.user ?? null,
    profile,
    loading,
    loginContext,
    setLoginContext: (context: LoginContext) => {
      localStorage.setItem(LOGIN_CONTEXT_KEY, context);
      setLoginContextState(context);
    },
    signOut: async () => {
      // Clear the login-context flag first so a stale "host" or "entrant"
      // context can never leak into the next session on this device.
      localStorage.removeItem(LOGIN_CONTEXT_KEY);
      setLoginContextState(null);
      await clientRef.current?.auth.signOut();
    },
    refreshProfile: async () => {
      const client = clientRef.current;
      if (client && session?.user) setProfile(await fetchProfile(client, session.user.id));
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
