import { type InputHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return (
      <input
        ref={ref}
        className={cn(
          "h-11 min-h-11 w-full rounded-md border border-border bg-surface px-3 text-sm text-fg",
          "placeholder:text-subtle outline-none transition-[border-color,box-shadow] duration-150",
          "focus-visible:border-accent/50 focus-visible:ring-2 focus-visible:ring-accent/40",
          className,
        )}
        {...props}
      />
    );
  },
);
