import type { Stage } from "@/lib/types";

const LABELS: Record<Stage, string> = {
  R32: "ROUND OF 32",
  R16: "ROUND OF 16",
  QF: "QUARTER-FINAL",
  SF: "SEMI-FINAL",
  "3P": "THIRD PLACE",
  F: "THE FINAL",
};

export default function StagePill({
  stage,
  className = "",
}: {
  stage: Stage;
  className?: string;
}) {
  return (
    <span
      className={`data-nums inline-flex items-center rounded-full border border-flood/15 px-2.5 py-1 text-[10px] font-medium tracking-[0.14em] text-flood-dim ${className}`}
    >
      {LABELS[stage]}
    </span>
  );
}
