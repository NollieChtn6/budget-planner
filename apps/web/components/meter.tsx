import { cn } from "@/lib/utils";

/** The charte's track/fill bar: used for envelope consumption and provision progress. */
export function Meter({
  percent,
  label,
  valueText,
  marker,
  className,
}: {
  percent: number;
  label: string;
  /** Read by screen readers in place of the bare percentage, e.g. "66,67 € sur 500,00 €". */
  valueText?: string;
  /** A tick on the track, as a percentage: where the fill should be by now. */
  marker?: number;
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
      aria-valuetext={valueText}
      className="relative h-2 overflow-hidden rounded-full bg-muted ring-1 ring-border ring-inset"
    >
      <div
        className={cn(
          "h-full rounded-full transition-[width] motion-reduce:transition-none",
          className,
        )}
        style={{ width: `${clamped}%` }}
      />
      {marker === undefined ? null : (
        <div
          aria-hidden
          className="absolute inset-y-0 w-0.5 bg-foreground/70"
          style={{ left: `${Math.max(0, Math.min(100, marker))}%` }}
        />
      )}
    </div>
  );
}
