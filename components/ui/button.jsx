import * as React from "react";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-semibold ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00A76F] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] cursor-pointer",
  {
    variants: {
      variant: {
        default: "bg-[#00A76F] text-white hover:bg-[#007856] shadow-md shadow-[#00A76F]/20",
        destructive: "bg-red-600 text-white hover:bg-red-700 shadow-md shadow-red-600/20",
        outline: "border border-[#E5E8EB] dark:border-[#2E3844] bg-white hover:bg-[#F4F6F8] text-[#1C252E] dark:bg-[#1C252E] dark:text-white dark:hover:bg-[#2A3542]",
        secondary: "bg-[#F4F6F8] text-[#1C252E] hover:bg-[#E5E8EB] dark:bg-[#212B36] dark:text-white dark:hover:bg-[#2E3844]",
        ghost: "hover:bg-[#F4F6F8] hover:text-[#1C252E] dark:hover:bg-[#212B36] dark:hover:text-white",
        link: "text-[#00A76F] underline-offset-4 hover:underline",
        gradient: "bg-gradient-to-r from-[#00A76F] to-[#007856] text-white shadow-lg shadow-[#00A76F]/25 hover:opacity-95",
        kiosk: "bg-[#00A76F] text-white text-lg py-5 px-8 rounded-2xl hover:bg-[#007856] shadow-xl shadow-[#00A76F]/30",
      },
      size: {
        default: "h-11 px-5 py-2.5",
        sm: "h-9 rounded-lg px-3.5 text-xs",
        lg: "h-13 rounded-2xl px-8 text-base",
        icon: "h-10 w-10",
        kiosk: "h-16 px-8 text-lg font-bold",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

const Button = React.forwardRef(({ className, variant, size, ...props }, ref) => {
  return (
    <button
      className={cn(buttonVariants({ variant, size, className }))}
      ref={ref}
      {...props}
    />
  );
});
Button.displayName = "Button";

export { Button, buttonVariants };
