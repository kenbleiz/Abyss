import { type ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "ghost" | "quiet";

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }
>(function Button({ className, variant = "primary", type = "button", ...props }, ref) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        "inline-flex h-11 min-h-11 items-center justify-center gap-2 rounded-md px-4 text-sm font-medium",
        "transition-[transform,opacity,background-color] duration-150 ease-[var(--ease-out-soft)]",
        "active:not-disabled:scale-[0.96] disabled:opacity-40",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60",
        variant === "primary" && "bg-accent text-accent-fg hover:opacity-90",
        variant === "ghost" && "border border-border bg-surface text-fg hover:bg-surface-2",
        variant === "quiet" && "bg-transparent text-muted hover:text-fg hover:bg-surface-2",
        className,
      )}
      {...props}
    />
  );
});
