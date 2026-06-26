import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

/** Sun/moon button that flips between the light and dark themes. */
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      title={isDark ? "Light theme" : "Dark theme"}
      className={cn(
        "focus-ring grid h-9 w-9 place-items-center rounded-lg border border-line bg-surface text-ink-muted transition-all duration-300 hover:text-ink",
        className,
      )}
    >
      {isDark ? (
        <Sun strokeWidth={1.5} className="h-[18px] w-[18px]" />
      ) : (
        <Moon strokeWidth={1.5} className="h-[18px] w-[18px]" />
      )}
    </button>
  );
}
