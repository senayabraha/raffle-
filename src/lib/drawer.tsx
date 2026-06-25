import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

interface DrawerState {
  isOpen: boolean;
  /** True once the drawer has been opened at least once; never resets. Lets
   * the drawer's framer-motion-heavy chunk stay unmounted (and unfetched)
   * on pages that never open it, instead of loading on every page load. */
  hasOpened: boolean;
  open: () => void;
  close: () => void;
}

const DrawerContext = createContext<DrawerState | undefined>(undefined);

/** Global slide-out nav drawer state, reachable from the hamburger trigger anywhere in the app. */
export function DrawerProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [hasOpened, setHasOpened] = useState(false);

  // Scroll lock: freeze the body in place while the drawer is open so touch/scroll
  // gestures inside the drawer don't bleed through to the page behind it.
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
    <DrawerContext.Provider
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
    </DrawerContext.Provider>
  );
}

export function useDrawer() {
  const ctx = useContext(DrawerContext);
  if (!ctx) throw new Error("useDrawer must be used within DrawerProvider");
  return ctx;
}
