import { cn } from "@/lib/utils/cn";
import type { HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "elevated" | "outlined" | "ghost";
  rounded?: boolean;
}

export function Card({ className, variant = "elevated", rounded = false, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "transition-colors",
        rounded ? "rounded-xl" : "rounded-none",
        {
          elevated: "border border-stone-200/60 bg-white shadow-sm dark:border-stone-800 dark:bg-stone-900",
          outlined: "border border-stone-200 bg-transparent dark:border-stone-700",
          ghost: "bg-stone-50 dark:bg-stone-800/50",
        }[variant],
        "p-6",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("font-serif text-xl text-stone-900 dark:text-stone-100", className)} {...props} />;
}

export function CardDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("mt-1 text-sm text-stone-500 dark:text-stone-400", className)} {...props} />;
}
