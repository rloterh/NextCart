"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, CheckCircle2, Info, X, AlertTriangle } from "lucide-react";
import { useUIStore } from "@/stores/ui-store";
import { cn } from "@/lib/utils/cn";

const toastIcons = {
  success: CheckCircle2,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const toastStyles = {
  success: "border-emerald-200 bg-white text-stone-900 dark:border-emerald-900/40 dark:bg-stone-900 dark:text-stone-100",
  error: "border-red-200 bg-white text-stone-900 dark:border-red-900/40 dark:bg-stone-900 dark:text-stone-100",
  warning: "border-amber-200 bg-white text-stone-900 dark:border-amber-900/40 dark:bg-stone-900 dark:text-stone-100",
  info: "border-stone-200 bg-white text-stone-900 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100",
};

const iconStyles = {
  success: "text-emerald-600 dark:text-emerald-400",
  error: "text-red-600 dark:text-red-400",
  warning: "text-amber-600 dark:text-amber-400",
  info: "text-stone-500 dark:text-stone-400",
};

export function ToastViewport() {
  const toasts = useUIStore((s) => s.toasts);
  const removeToast = useUIStore((s) => s.removeToast);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-[70] flex justify-center px-4 sm:justify-end sm:px-6">
      <div className="flex w-full max-w-sm flex-col gap-3">
        <AnimatePresence initial={false}>
          {toasts.map((toast) => {
            const Icon = toastIcons[toast.type];
            return (
              <motion.div
                key={toast.id}
                initial={{ opacity: 0, y: -12, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.96 }}
                transition={{ duration: 0.22 }}
                className={cn(
                  "pointer-events-auto overflow-hidden border shadow-xl shadow-stone-900/10 backdrop-blur-sm",
                  toastStyles[toast.type]
                )}
              >
                <div className="flex items-start gap-3 p-4">
                  <div className={cn("mt-0.5 shrink-0", iconStyles[toast.type])}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{toast.title}</p>
                    {toast.description && (
                      <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">{toast.description}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeToast(toast.id)}
                    className="rounded-sm p-1 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-700 dark:hover:bg-stone-800 dark:hover:text-stone-200"
                    aria-label="Dismiss notification"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
