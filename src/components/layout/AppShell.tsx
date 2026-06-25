import { lazy, Suspense, type ReactNode } from "react";
import { AuroraBackground } from "@/components/ui/AuroraBackground";
import { DashboardDrawerProvider, useDashboardDrawer } from "@/lib/dashboardDrawer";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

/**
 * Lazy because DashboardDrawer pulls in framer-motion. A static import here
 * meant every authenticated page (Dashboard, CreateRaffle, Account, ...)
 * paid for that chunk even when the mobile drawer was never opened.
 */
const DashboardDrawer = lazy(() =>
  import("./DashboardDrawer").then((m) => ({ default: m.DashboardDrawer })),
);

/** Mounts the (lazy) drawer only once it's actually been opened, so its
 * chunk is never fetched on pages that never use it. */
function DashboardDrawerGate() {
  const { hasOpened } = useDashboardDrawer();
  if (!hasOpened) return null;
  return (
    <Suspense fallback={null}>
      <DashboardDrawer />
    </Suspense>
  );
}

/** Global authenticated layout: aurora bg + glass sidebar + sticky topbar. */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <DashboardDrawerProvider>
      <div className="relative flex min-h-screen">
        <AuroraBackground />
        <Sidebar />
        <DashboardDrawerGate />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar />
          <main className="flex-1 px-5 py-6 sm:px-8 sm:py-8">{children}</main>
        </div>
      </div>
    </DashboardDrawerProvider>
  );
}
