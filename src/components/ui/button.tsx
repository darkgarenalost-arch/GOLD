import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex h-10 items-center justify-center gap-2 rounded-md border px-3 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-60",
  {
    variants: {
      variant: {
        primary: "border-amber-300 bg-amber-300 text-slate-950 hover:bg-amber-200 focus-visible:outline-amber-300",
        ghost: "border-slate-700 bg-slate-900/60 text-slate-100 hover:bg-slate-800 focus-visible:outline-slate-400",
        danger: "border-red-400/50 bg-red-500/15 text-red-100 hover:bg-red-500/25 focus-visible:outline-red-300"
      },
      size: {
        sm: "h-8 px-2.5 text-xs",
        md: "h-10 px-3 text-sm",
        icon: "h-10 w-10 px-0"
      }
    },
    defaultVariants: {
      variant: "ghost",
      size: "md"
    }
  }
);

export function Button({
  className,
  variant,
  size,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonVariants>) {
  return <button className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
