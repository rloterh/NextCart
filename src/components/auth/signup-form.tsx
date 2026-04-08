"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { ShoppingBag, Store } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useUIStore } from "@/stores/ui-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils/cn";

type SignupRole = "buyer" | "vendor";

export function SignupForm() {
  const router = useRouter();
  const addToast = useUIStore((s) => s.addToast);
  const [isLoading, setIsLoading] = useState(false);
  const [role, setRole] = useState<SignupRole>("buyer");
  const [form, setForm] = useState({ fullName: "", email: "", password: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate() {
    const errs: Record<string, string> = {};
    if (!form.fullName.trim()) errs.fullName = "Required";
    if (!form.email) errs.email = "Required";
    if (!form.password || form.password.length < 8) errs.password = "Min 8 characters";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setIsLoading(true);
    const supabase = getSupabaseBrowserClient();

    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: { data: { full_name: form.fullName, role } },
    });

    if (error) {
      addToast({ type: "error", title: "Signup failed", description: error.message });
      setIsLoading(false);
      return;
    }

    addToast({
      type: "success",
      title: "Account created!",
      description: role === "vendor" ? "Your vendor application is under review." : "Check your email to verify.",
    });
    router.push("/login");
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="w-full max-w-sm"
    >
      <div className="mb-10 text-center">
        <h1 className="font-serif text-3xl text-stone-900 dark:text-white">Join NexCart</h1>
        <p className="mt-2 text-sm text-stone-500">Create your account to get started</p>
      </div>

      {/* Role selector */}
      <div className="mb-8 grid grid-cols-2 gap-3">
        {([
          { value: "buyer" as const, label: "Shopper", desc: "Browse & buy", icon: ShoppingBag },
          { value: "vendor" as const, label: "Vendor", desc: "Open a store", icon: Store },
        ]).map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setRole(opt.value)}
            className={cn(
              "flex flex-col items-center gap-2 border p-4 text-center transition-all",
              role === opt.value
                ? "border-stone-900 bg-stone-900 text-white dark:border-white dark:bg-white dark:text-stone-900"
                : "border-stone-200 text-stone-600 hover:border-stone-400 dark:border-stone-700 dark:text-stone-400"
            )}
          >
            <opt.icon className="h-5 w-5" />
            <span className="text-xs font-medium uppercase tracking-wider">{opt.label}</span>
            <span className={cn("text-[10px]", role === opt.value ? "text-stone-300 dark:text-stone-500" : "text-stone-400")}>{opt.desc}</span>
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Input label="Full name" placeholder="Jane Smith" value={form.fullName}
          onChange={(e) => setForm({ ...form, fullName: e.target.value })} error={errors.fullName} autoComplete="name" />
        <Input label="Email" type="email" placeholder="you@example.com" value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })} error={errors.email} autoComplete="email" />
        <Input label="Password" type="password" placeholder="Min 8 characters" value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })} error={errors.password} autoComplete="new-password" />

        <Button type="submit" isLoading={isLoading} className="w-full">
          {role === "vendor" ? "Apply as vendor" : "Create account"}
        </Button>
      </form>

      <p className="mt-8 text-center text-sm text-stone-500">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-stone-900 hover:underline dark:text-white">Sign in</Link>
      </p>
    </motion.div>
  );
}
