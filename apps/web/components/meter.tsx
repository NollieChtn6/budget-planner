import { cn } from "@/lib/utils";

/** The charte's track/fill bar: used for envelope consumption and provision progress. */
export function Meter({
  percent,
  label,
  className,
}: {
  percent: number;
  label: string;
  className?: string;
}) {
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clamped)}
      className="h-2 overflow-hidden rounded-full bg-muted"
    >
      <div
        className={cn(
          "h-full rounded-full transition-[width] motion-reduce:transition-none",
          className,
        )}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
