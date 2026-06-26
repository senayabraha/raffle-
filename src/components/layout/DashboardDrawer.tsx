import { AnimatePresence, motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { LogOut, X } from "lucide-react";
import { useDashboardDrawer } from "@/lib/dashboardDrawer";
import { useAuth } from "@/lib/auth";
import { primaryNav, secondaryNav, NavItem } from "./Sidebar";

/** Mobile equivalent of the desktop Sidebar — the same dashboard nav links, opened from Topbar's hamburger. */
export function DashboardDrawer() {
  const { isOpen, close } = useDashboardDrawer();
  const navigate = useNavigate();
  const { signOut } = useAuth();

  async function handleSignOut() {
    close();
    await signOut();
    navigate("/en");
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] lg:hidden">
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            onClick={close}
            aria-hidden
          />

          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label="Dashboard menu"
            className="absolute inset-y-0 left-0 flex w-[75%] max-w-[320px] flex-col gap-1 overflow-y-auto border-r border-line bg-surface/95 p-3 pb-4 backdrop-blur-xl shadow-soft-lift"
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", stiffness: 340, damping: 34 }}
          >
            <div className="flex items-center justify-between px-2 pb-4">
              <div className="leading-tight">
                <p className="text-[15px] font-bold tracking-tight text-ink">Raffall</p>
                <p className="text-[11px] text-ink-subtle">Host Studio</p>
              </div>
              <button
                onClick={close}
                aria-label="Close menu"
                className="focus-ring grid h-9 w-9 place-items-center rounded-xl border border-line bg-surface text-ink transition-all duration-300 hover:border-line hover:bg-surface-2"
              >
                <X strokeWidth={1.5} className="h-[18px] w-[18px]" />
              </button>
            </div>

            <nav className="flex flex-col gap-1" onClick={close}>
              {primaryNav.map((item) => (
                <NavItem key={item.to} {...item} />
              ))}
            </nav>

            <div className="my-4 h-px divider-faded" />

            <nav className="flex flex-col gap-1" onClick={close}>
              {secondaryNav.map((item) => (
                <NavItem key={item.to} {...item} />
              ))}
            </nav>

            <button
              onClick={handleSignOut}
              className="mt-auto flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-ink-muted transition-colors hover:bg-surface hover:text-rose-300"
            >
              <LogOut strokeWidth={1.5} className="h-[18px] w-[18px]" />
              Sign out
            </button>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
