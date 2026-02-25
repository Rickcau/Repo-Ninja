"use client";

import React from "react";
import { cn } from "@/lib/utils";

type ProgressVariant = "primary" | "success" | "warning" | "critical";

interface ProgressBarProps {
  /** Progress value from 0 to 100 */
  value: number;
  /** Color variant */
  variant?: ProgressVariant;
  /** Optional label - shows percentage if true, or custom text */
  label?: boolean | string;
  /** Additional class names for the outer container */
  className?: string;
  /** Whether to animate the fill bar */
  animated?: boolean;
}

const variantColors: Record<ProgressVariant, string> = {
  primary: "var(--progress-fill)",
  success: "var(--status-success)",
  warning: "var(--status-warning)",
  critical: "var(--status-critical)",
};

/**
 * ProgressBar - Reusable progress indicator with color variants.
 * Uses CSS custom properties for theming (--progress-track, --progress-fill, --status-*).
 */
export function ProgressBar({
  value,
  variant = "primary",
  label,
  className,
  animated = true,
}: ProgressBarProps) {
  const clampedValue = Math.max(0, Math.min(100, value));
  const fillColor = variantColors[variant];

  const labelText =
    typeof label === "string" ? label : label ? `${Math.round(clampedValue)}%` : null;

  return (
    <div className={cn("space-y-1.5", className)}>
      {labelText && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{labelText}</span>
          {typeof label !== "string" && (
            <span className="text-xs font-medium text-foreground">
              {Math.round(clampedValue)}%
            </span>
          )}
        </div>
      )}
      <div
        className="h-2 w-full overflow-hidden rounded-full"
        style={{ backgroundColor: "var(--progress-track)" }}
        role="progressbar"
        aria-valuenow={clampedValue}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={cn(
            "h-full rounded-full",
            animated && "transition-all duration-500 ease-out"
          )}
          style={{
            width: `${clampedValue}%`,
            backgroundColor: fillColor,
          }}
        />
      </div>
    </div>
  );
}
