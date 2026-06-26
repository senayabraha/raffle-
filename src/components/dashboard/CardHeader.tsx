import type { ReactNode } from "react";

interface CardHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}

export function CardHeader({ title, subtitle, action }: CardHeaderProps) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div>
        <h3 className="text-[15px] font-semibold tracking-tight text-ink">
          {title}
        </h3>
        {subtitle && <p className="mt-0.5 text-xs text-ink-subtle">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
