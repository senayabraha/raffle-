import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

interface DrawerState {
  isOpen: boolean;
  /** True once the drawer has been opened at least once; never resets. Lets
   * the drawer's framer-motion-heavy chunk stay unmounted (and unfetched)
   * until it's actually needed, instead of loading on every dashboard page. */
  hasOpened: boolean;
  open: () => void;
  close: () => void;
}

const DashboardDrawerContext = createContext<DrawerState | undefined>(undefined);

/** Slide-out drawer state for the host dashboard's mobile nav, scoped to AppShell. */
export function DashboardDrawerProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [hasOpened, setHasOpened] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const scrollY = window.scrollY;
    const { overflow, position, top, width } = document.body.style;
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";
    return () => {
      document.body.style.overflow = overflow;
      document.body.style.position = position;
      document.body.style.top = top;
      document.body.style.width = width;
      window.scrollTo(0, scrollY);
    };
  }, [isOpen]);

  return (
    <DashboardDrawerContext.Provider
      value={{
        isOpen,
        hasOpened,
        open: () => {
          setIsOpen(true);
          setHasOpened(true);
        },
        close: () => setIsOpen(false),
      }}
    >
      {children}
    </DashboardDrawerContext.Provider>
  );
}

export function useDashboardDrawer() {
  const ctx = useContext(DashboardDrawerContext);
  if (!ctx) throw new Error("useDashboardDrawer must be used within DashboardDrawerProvider");
  return ctx;
}
