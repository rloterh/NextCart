"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils/cn";

export function PageTransition({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.22, ease: "easeOut" }}
      className={cn("space-y-6", className)}
    >
      {children}
    </motion.div>
  );
}

export function PageIntro({
  title,
  description,
  eyebrow,
  actions,
  className,
}: {
  title: string;
  description?: string;
  eyebrow?: string;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between", className)}>
      <div>
        {eyebrow ? (
          <p className="text-xs font-medium uppercase tracking-[0.28em] text-stone-400">{eyebrow}</p>
        ) : null}
        <CardTitle className={eyebrow ? "mt-2 text-2xl" : "text-2xl"}>{title}</CardTitle>
        {description ? <CardDescription className="max-w-3xl">{description}</CardDescription> : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-3">{actions}</div> : null}
    </Card>
  );
}
