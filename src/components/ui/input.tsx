"use client";

import { forwardRef, type InputHTMLAttributes, useState } from "react";
import { cn } from "@/lib/utils/cn";
import { Eye, EyeOff } from "lucide-react";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, type, id, ...props }, ref) => {
    const [showPw, setShowPw] = useState(false);
    const isPw = type === "password";
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-medium uppercase tracking-widest text-stone-500 dark:text-stone-400">
            {label}
          </label>
        )}
        <div className="relative">
          <input
            ref={ref}
            id={inputId}
            type={isPw && showPw ? "text" : type}
            className={cn(
              "flex h-11 w-full border-b bg-transparent px-0 py-2 text-sm text-stone-900 transition-colors",
              "placeholder:text-stone-400 focus:outline-none",
              "dark:text-stone-100",
              error
                ? "border-red-400 focus:border-red-600"
                : "border-stone-200 focus:border-stone-900 dark:border-stone-700 dark:focus:border-stone-400",
              isPw && "pr-10",
              className
            )}
            {...props}
          />
          {isPw && (
            <button type="button" tabIndex={-1} onClick={() => setShowPw(!showPw)}
              className="absolute right-0 top-1/2 -translate-y-1/2 p-2 text-stone-400 hover:text-stone-600">
              {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          )}
        </div>
        {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
        {hint && !error && <p className="text-xs text-stone-400">{hint}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";
export { Input };
