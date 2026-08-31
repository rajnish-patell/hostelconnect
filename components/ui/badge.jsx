import * as React from "react";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-3 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
        secondary: "border-transparent bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300",
        destructive: "border-transparent bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20",
        success: "border-transparent bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
        warning: "border-transparent bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
        outline: "text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

function Badge({ className, variant, ...props }) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
