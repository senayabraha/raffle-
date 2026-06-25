import type { ReactNode } from "react";
import { AuroraBackground } from "@/components/ui/AuroraBackground";
import { DashboardDrawerProvider } from "@/lib/dashboardDrawer";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { DashboardDrawer } from "./DashboardDrawer";

/** Global authenticated layout: aurora bg + glass sidebar + sticky topbar. */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <DashboardDrawerProvider>
      <div className="relative flex min-h-screen">
        <AuroraBackground />
        <Sidebar />
        <DashboardDrawer />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar />
          <main className="flex-1 px-5 py-6 sm:px-8 sm:py-8">{children}</main>
        </div>
      </div>
    </DashboardDrawerProvider>
  );
}
