"use client";

import React from "react";
import { cn } from "@/lib/utils";

/**
 * Base shimmer element used by all skeleton variants.
 * Uses the skeleton-shimmer CSS animation and design tokens from globals.css.
 */
function ShimmerBlock({
  className,
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={cn("rounded-md", className)}
      style={{
        background:
          "linear-gradient(90deg, var(--skeleton-base) 25%, var(--skeleton-shimmer) 50%, var(--skeleton-base) 75%)",
        backgroundSize: "200% 100%",
        animation: "skeleton-shimmer 1.5s ease-in-out infinite",
        ...style,
      }}
    />
  );
}

/**
 * SkeletonCard - Mimics a stat card shape with shimmer animation.
 * Use as a placeholder while stat/metric cards are loading.
 */
export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border p-5 space-y-3",
        className
      )}
      style={{ backgroundColor: "var(--skeleton-base)" }}
    >
      {/* Icon placeholder */}
      <ShimmerBlock className="h-8 w-8 rounded-lg" />
      {/* Title line */}
      <ShimmerBlock className="h-3 w-24" />
      {/* Value line */}
      <ShimmerBlock className="h-7 w-16" />
      {/* Subtitle line */}
      <ShimmerBlock className="h-3 w-32" />
    </div>
  );
}

/**
 * SkeletonTable - Mimics a table with shimmer rows.
 * @param rows - Number of placeholder rows to render (default 5)
 * @param columns - Number of placeholder columns to render (default 4)
 */
export function SkeletonTable({
  rows = 5,
  columns = 4,
  className,
}: {
  rows?: number;
  columns?: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border overflow-hidden",
        className
      )}
      style={{ backgroundColor: "var(--skeleton-base)" }}
    >
      {/* Header row */}
      <div className="flex gap-4 px-4 py-3 border-b border-border">
        {Array.from({ length: columns }).map((_, i) => (
          <ShimmerBlock
            key={`header-${i}`}
            className="h-3 flex-1"
          />
        ))}
      </div>
      {/* Data rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          key={`row-${rowIndex}`}
          className="flex gap-4 px-4 py-3 border-b border-border last:border-b-0"
        >
          {Array.from({ length: columns }).map((_, colIndex) => (
            <ShimmerBlock
              key={`cell-${rowIndex}-${colIndex}`}
              className="h-3 flex-1"
              // Vary widths slightly for a more natural look
            />
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * SkeletonText - Mimics text lines with shimmer animation.
 * @param lines - Number of lines to render (default 3)
 */
export function SkeletonText({
  lines = 3,
  className,
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <ShimmerBlock
          key={`line-${i}`}
          className="h-3"
          // Last line is shorter for natural paragraph appearance
          style={
            i === lines - 1
              ? { width: "60%" }
              : undefined
          }
        />
      ))}
    </div>
  );
}
