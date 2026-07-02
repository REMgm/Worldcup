export default function StatChip({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string | number;
  accent?: boolean;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5 rounded-xl bg-pitch-700 px-3 py-2">
      <span className="truncate text-[10px] font-medium uppercase tracking-[0.12em] text-flood-dim">
        {label}
      </span>
      <span
        className={`data-nums text-lg font-bold leading-none ${accent ? "text-lime" : "text-flood"}`}
      >
        {value}
      </span>
    </div>
  );
}
