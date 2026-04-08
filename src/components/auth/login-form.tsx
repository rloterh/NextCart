"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useUIStore } from "@/stores/ui-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function LoginForm() {
  const router = useRouter();
  const addToast = useUIStore((s) => s.addToast);
  const [isLoading, setIsLoading] = useState(false);
  const [form, setForm] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate() {
    const errs: Record<string, string> = {};
    if (!form.email) errs.email = "Required";
    if (!form.password) errs.password = "Required";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setIsLoading(true);
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithPassword(form);
    if (error) {
      addToast({ type: "error", title: "Sign in failed", description: error.message });
      setIsLoading(false);
      return;
    }
    addToast({ type: "success", title: "Welcome back" });
    router.push("/");
    router.refresh();
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="w-full max-w-sm"
    >
      <div className="mb-10 text-center">
        <h1 className="font-serif text-3xl text-stone-900 dark:text-white">Welcome back</h1>
        <p className="mt-2 text-sm text-stone-500">Sign in to your NexCart account</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Input label="Email" type="email" placeholder="you@example.com" value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })} error={errors.email} autoComplete="email" />
        <Input label="Password" type="password" placeholder="Enter password" value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })} error={errors.password} autoComplete="current-password" />

        <div className="flex justify-end">
          <Link href="/forgot-password" className="text-xs text-stone-500 hover:text-stone-900 dark:hover:text-white">
            Forgot password?
          </Link>
        </div>

        <Button type="submit" isLoading={isLoading} className="w-full">Sign in</Button>
      </form>

      <div className="relative my-8">
        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-stone-200 dark:border-stone-700" /></div>
        <div className="relative flex justify-center text-xs uppercase tracking-widest">
          <span className="bg-white px-3 text-stone-400 dark:bg-stone-950">or</span>
        </div>
      </div>

      {/* OAuth buttons */}
      <div className="grid grid-cols-2 gap-3">
        <Button variant="outline" className="h-11">Google</Button>
        <Button variant="outline" className="h-11">GitHub</Button>
      </div>

      <p className="mt-8 text-center text-sm text-stone-500">
        New here?{" "}
        <Link href="/signup" className="font-medium text-stone-900 hover:underline dark:text-white">Create account</Link>
      </p>
    </motion.div>
  );
}
