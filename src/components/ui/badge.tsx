import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex h-7 items-center rounded-md border px-2.5 text-xs font-semibold uppercase tracking-normal",
  {
    variants: {
      tone: {
        neutral: "border-slate-600 bg-slate-800 text-slate-100",
        gold: "border-amber-400/40 bg-amber-400/15 text-amber-200",
        green: "border-emerald-400/40 bg-emerald-400/15 text-emerald-200",
        red: "border-red-400/40 bg-red-400/15 text-red-200",
        blue: "border-blue-400/40 bg-blue-400/15 text-blue-200"
      }
    },
    defaultVariants: {
      tone: "neutral"
    }
  }
);

export function Badge({
  className,
  tone,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}
