import { cn } from "@/lib/utils";

export function Panel({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <section
      className={cn("rounded-lg border border-slate-700/80 bg-slate-950/62 p-4 shadow-2xl shadow-black/20", className)}
      {...props}
    />
  );
}

export function Metric({
  label,
  value,
  detail,
  className
}: {
  label: string;
  value: React.ReactNode;
  detail?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-md border border-slate-800 bg-slate-900/70 p-3", className)}>
      <div className="text-xs font-semibold uppercase text-slate-400">{label}</div>
      <div className="mt-2 text-2xl font-bold text-white">{value}</div>
      {detail ? <div className="mt-1 text-sm text-slate-400">{detail}</div> : null}
    </div>
  );
}
