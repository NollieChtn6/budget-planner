import { cn } from "@/lib/utils";

/** The charte's track/fill bar: used for envelope consumption and provision progress. */
export function Meter({ percent, className }: { percent: number; className?: string }) {
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <div className="h-2 overflow-hidden rounded-full bg-muted">
      <div
        className={cn("h-full rounded-full transition-[width]", className)}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
