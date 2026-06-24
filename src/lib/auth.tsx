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

    import("./supabase").then(async ({ supabase }) => {
      if (!active) return;
      clientRef.current = supabase;

      const { data } = await supabase.auth.getSession();
      if (!active) return;
      setSession(data.session);
      if (data.session?.user) setProfile(await fetchProfile(supabase, data.session.user.id));
      setLoading(false);

      const { data: sub } = supabase.auth.onAuthStateChange(async (_event, next) => {
        if (!active) return;
        setSession(next);
        setProfile(next?.user ? await fetchProfile(supabase, next.user.id) : null);
      });
      unsubscribe = () => sub.subscription.unsubscribe();
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
