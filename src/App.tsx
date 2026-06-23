import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import type { ReactNode } from "react";
import { AuthProvider, useAuth } from "@/lib/auth";
import Landing from "@/pages/Landing";
import Dashboard from "@/pages/Dashboard";
import CreateRaffle from "@/pages/CreateRaffle";
import EndedRaffle from "@/pages/EndedRaffle";
import Marketplace from "@/pages/Marketplace";
import RaffleDetail from "@/pages/RaffleDetail";
import Login from "@/pages/Login";
import Register from "@/pages/Register";

/** Gates authenticated routes; redirects to login once we know there's no session. */
function RequireAuth({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();
  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-accent" />
      </div>
    );
  }
  if (!session) return <Navigate to="/en/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
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
          {/* Public marketplace */}
          <Route path="/en/public-raffles/live" element={<Marketplace />} />
          <Route path="/en/public-raffles/ended" element={<Marketplace />} />
          <Route path="/en/raffle/:slug" element={<RaffleDetail />} />
          <Route path="*" element={<Navigate to="/en" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
