import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Suspense, lazy, type ReactNode } from "react";
import { AuthProvider, useAuth } from "@/lib/auth";
import type { Tables } from "@/lib/database.types";

type Role = Tables<"profiles">["role"];

const HOST_ROLES: Role[] = ["host", "both", "admin"];
const ENTRANT_ROLES: Role[] = ["entrant", "both", "admin"];

/**
 * Pages are code-split so the landing page no longer ships the dashboard
 * charts, the create-raffle wizard, framer-motion-heavy views, etc. Each
 * route's chunk loads on demand, keeping the initial homepage payload small.
 */
const Landing = lazy(() => import("@/pages/Landing"));
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const CreateRaffle = lazy(() => import("@/pages/CreateRaffle"));
const EndedRaffle = lazy(() => import("@/pages/EndedRaffle"));
const Marketplace = lazy(() => import("@/pages/Marketplace"));
const RaffleDetail = lazy(() => import("@/pages/RaffleDetail"));
const Login = lazy(() => import("@/pages/Login"));
const HostLogin = lazy(() => import("@/pages/HostLogin"));
const Register = lazy(() => import("@/pages/Register"));
const MyTickets = lazy(() => import("@/pages/MyTickets"));
const CheckoutSuccess = lazy(() => import("@/pages/CheckoutSuccess"));
const CheckoutCancelled = lazy(() => import("@/pages/CheckoutCancelled"));
const ComingSoon = lazy(() => import("@/pages/ComingSoon"));
const Legal = lazy(() => import("@/pages/Legal"));

/** Centered spinner shown while a lazy route chunk or the session loads. */
function FullPageSpinner() {
  return (
    <div className="grid min-h-screen place-items-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-accent" />
    </div>
  );
}

/**
 * Gates authenticated routes; redirects to login once we know there's no
 * session, carrying the page the user was trying to reach as `redirectTo` so
 * the entrant login can send them right back after they authenticate.
 */
function RequireAuth({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();
  const location = useLocation();
  if (loading) return <FullPageSpinner />;
  if (!session) {
    const dest = `${location.pathname}${location.search}`;
    return <Navigate to={`/en/login?redirectTo=${encodeURIComponent(dest)}`} replace />;
  }
  return <>{children}</>;
}

/**
 * Gates the Host dashboard. Landing here requires both a host-capable role
 * AND a session established through the dedicated Host login portal — a
 * Host-role account that authenticated from the public Entrant login is
 * deliberately kept out, per the entrant-context routing rule.
 */
function RequireHostContext({ children }: { children: ReactNode }) {
  const { profile, session, loginContext } = useAuth();
  if (session && !profile) return <FullPageSpinner />;
  if (profile) {
    const hasHostRole = HOST_ROLES.includes(profile.role);
    if (!hasHostRole || loginContext === "entrant") {
      return <Navigate to="/en/public-raffles/live" replace />;
    }
  }
  return <>{children}</>;
}

/**
 * Gates entrant routes (ticket purchase/viewing). A session established via
 * the Entrant login is always welcome here regardless of the account's
 * stored role, so a Host who signed in mid-checkout can finish their entry.
 */
function RequireEntrantContext({ children }: { children: ReactNode }) {
  const { profile, session, loginContext } = useAuth();
  if (session && !profile) return <FullPageSpinner />;
  if (profile) {
    const hasEntrantRole = ENTRANT_ROLES.includes(profile.role);
    if (!hasEntrantRole && loginContext !== "entrant") {
      return <Navigate to="/en/dashboard" replace />;
    }
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={<FullPageSpinner />}>
          <Routes>
            <Route path="/" element={<Navigate to="/en" replace />} />
            <Route path="/en" element={<Landing />} />
            {/* Auth */}
            <Route path="/en/login" element={<Login />} />
            <Route path="/en/host/login" element={<HostLogin />} />
            <Route path="/en/register" element={<Register />} />
            {/* Host dashboard (authenticated, Host-portal context only) */}
            <Route
              path="/en/dashboard/create"
              element={
                <RequireAuth>
                  <RequireHostContext>
                    <CreateRaffle />
                  </RequireHostContext>
                </RequireAuth>
              }
            />
            <Route
              path="/en/dashboard/ended"
              element={
                <RequireAuth>
                  <RequireHostContext>
                    <EndedRaffle />
                  </RequireHostContext>
                </RequireAuth>
              }
            />
            <Route
              path="/en/dashboard/*"
              element={
                <RequireAuth>
                  <RequireHostContext>
                    <Dashboard />
                  </RequireHostContext>
                </RequireAuth>
              }
            />
            {/* Account & support (authenticated, placeholder until built) */}
            <Route
              path="/en/account"
              element={
                <RequireAuth>
                  <ComingSoon title="Settings" />
                </RequireAuth>
              }
            />
            <Route
              path="/en/support"
              element={
                <RequireAuth>
                  <ComingSoon title="Support" />
                </RequireAuth>
              }
            />
            {/* Entrant */}
            <Route
              path="/en/tickets"
              element={
                <RequireAuth>
                  <RequireEntrantContext>
                    <MyTickets />
                  </RequireEntrantContext>
                </RequireAuth>
              }
            />
            {/* Checkout return pages (public — guests can check out without an account) */}
            <Route path="/en/checkout/success" element={<CheckoutSuccess />} />
            <Route path="/en/checkout/cancelled" element={<CheckoutCancelled />} />
            {/* Legal / marketing footer */}
            <Route path="/en/terms" element={<Legal title="Terms & fees" />} />
            <Route path="/en/privacy" element={<Legal title="Privacy" />} />
            <Route path="/en/contact" element={<Legal title="Contact" />} />
            {/* Public marketplace */}
            <Route path="/en/public-raffles/live" element={<Marketplace />} />
            <Route path="/en/public-raffles/ended" element={<Marketplace />} />
            <Route path="/en/raffle/:slug" element={<RaffleDetail />} />
            <Route path="*" element={<Navigate to="/en" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  );
}
