import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Suspense, lazy, type ReactNode } from "react";
import { AuthProvider, useAuth } from "@/lib/auth";

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
const Register = lazy(() => import("@/pages/Register"));
const MyTickets = lazy(() => import("@/pages/MyTickets"));
const ComingSoon = lazy(() => import("@/pages/ComingSoon"));

/** Centered spinner shown while a lazy route chunk or the session loads. */
function FullPageSpinner() {
  return (
    <div className="grid min-h-screen place-items-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-accent" />
    </div>
  );
}

/** Gates authenticated routes; redirects to login once we know there's no session. */
function RequireAuth({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();
  if (loading) return <FullPageSpinner />;
  if (!session) return <Navigate to="/en/login" replace />;
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
            <Route path="/en/register" element={<Register />} />
            {/* Host dashboard (authenticated) */}
            <Route
              path="/en/dashboard/create"
              element={
                <RequireAuth>
                  <CreateRaffle />
                </RequireAuth>
              }
            />
            <Route
              path="/en/dashboard/ended"
              element={
                <RequireAuth>
                  <EndedRaffle />
                </RequireAuth>
              }
            />
            <Route
              path="/en/dashboard/*"
              element={
                <RequireAuth>
                  <Dashboard />
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
                  <MyTickets />
                </RequireAuth>
              }
            />
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
