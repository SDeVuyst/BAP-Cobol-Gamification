import { cn } from "@/lib/utils";

type MainframeStripProps = {
  left: string;
  right?: string;
  className?: string;
  /** Muted slate/cyan strip — less green (friends, softer panels). */
  variant?: "default" | "muted";
};

/** COBOL / 3270-style header bar (matches leaderboard podium strips). */
export function MainframeStrip({ left, right, className, variant = "default" }: MainframeStripProps) {
  const muted = variant === "muted";
  return (
    <div
      className={cn(
        muted
          ? "flex items-center justify-between gap-2 border-b border-slate-600/35 bg-[#060608] px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-slate-500/95 md:text-[11px]"
          : "mainframe-strip",
        className,
      )}
    >
      <span className="truncate">{left}</span>
      {right != null && right !== "" && (
        <span
          className={cn(
            "shrink-0 font-mono normal-case tracking-normal",
            muted ? "text-cyan-600/75" : "text-emerald-400/90",
          )}
        >
          {right}
        </span>
      )}
    </div>
  );
}
