"use client";

/**
 * Reusable skeleton loading components. Replaces plain "Loading..." text
 * with animated placeholder shapes that match the layout of the real content,
 * reducing perceived load time and layout shift.
 */

export function SkeletonLine({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded bg-slate-800 ${className}`}
      style={{ height: "1rem" }}
    />
  );
}

export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <div className="rounded border border-slate-800 bg-slate-900/40 p-4 space-y-3">
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonLine key={i} className={i === 0 ? "w-3/4" : i === lines - 1 ? "w-1/2" : "w-full"} />
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex gap-4 border-b border-slate-800 pb-2">
        {Array.from({ length: cols }).map((_, i) => (
          <SkeletonLine key={i} className="h-3 flex-1" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div key={rowIdx} className="flex gap-4 py-2">
          {Array.from({ length: cols }).map((_, colIdx) => (
            <SkeletonLine
              key={colIdx}
              className={`flex-1 ${colIdx === 0 ? "w-1/3" : colIdx === cols - 1 ? "w-1/4" : "w-1/2"}`}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkeletonList({ rows = 4 }: { rows?: number }) {
  return (
    <ul className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <li
          key={i}
          className="flex items-center justify-between rounded border border-slate-800 bg-slate-900/40 p-3"
        >
          <div className="space-y-2 flex-1">
            <SkeletonLine className="w-1/3" />
            <SkeletonLine className="w-2/3 h-3" />
          </div>
          <SkeletonLine className="w-16 h-6 ml-4" />
        </li>
      ))}
    </ul>
  );
}

export function SkeletonGrid({ cols = 3 }: { cols?: number }) {
  return (
    <div className={`grid gap-6 sm:grid-cols-${cols}`}>
      {Array.from({ length: cols }).map((_, i) => (
        <SkeletonCard key={i} lines={2} />
      ))}
    </div>
  );
}
