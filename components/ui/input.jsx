import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef(({ className, type, ...props }, ref) => {
  return (
    <input
      type={type}
      className={cn(
        "flex h-11 w-full rounded-xl border border-[#E5E8EB] bg-white px-4 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-[#919EAB] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00A76F] focus-visible:border-transparent disabled:cursor-not-allowed disabled:opacity-50 dark:border-[#2E3844] dark:bg-[#141A21] dark:text-white dark:placeholder:text-[#637381] transition-all",
        className
      )}
      ref={ref}
      {...props}
    />
  );
});
Input.displayName = "Input";

export { Input };
