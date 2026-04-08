"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface StarRatingProps {
  value: number;
  onChange?: (value: number) => void;
  size?: "sm" | "md" | "lg";
  readonly?: boolean;
  showValue?: boolean;
  count?: number;
}

export function StarRating({
  value,
  onChange,
  size = "md",
  readonly = false,
  showValue = false,
  count,
}: StarRatingProps) {
  const [hover, setHover] = useState(0);

  const sizeClass = { sm: "h-3.5 w-3.5", md: "h-4 w-4", lg: "h-5 w-5" }[size];
  const gap = { sm: "gap-0.5", md: "gap-0.5", lg: "gap-1" }[size];

  return (
    <div className={cn("flex items-center", gap)}>
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= (hover || value);
        return (
          <button
            key={star}
            type="button"
            disabled={readonly}
            onClick={() => onChange?.(star)}
            onMouseEnter={() => !readonly && setHover(star)}
            onMouseLeave={() => setHover(0)}
            className={cn(
              "transition-colors",
              readonly ? "cursor-default" : "cursor-pointer"
            )}
          >
            <Star
              className={cn(
                sizeClass,
                filled
                  ? "fill-amber-400 text-amber-400"
                  : "text-stone-200 dark:text-stone-600"
              )}
            />
          </button>
        );
      })}
      {showValue && (
        <span className="ml-1 text-sm font-medium text-stone-700 dark:text-stone-300">
          {value.toFixed(1)}
        </span>
      )}
      {count !== undefined && (
        <span className="ml-0.5 text-xs text-stone-400">({count})</span>
      )}
    </div>
  );
}
