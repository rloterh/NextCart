import type { ReactNode } from "react";
import Link from "next/link";
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <div className="hidden lg:flex lg:w-1/2 lg:flex-col lg:justify-between bg-stone-100 p-12 dark:bg-stone-900">
        <Link href="/" className="font-serif text-2xl tracking-tight text-stone-900 dark:text-white">
          Nex<span className="font-normal italic text-amber-700 dark:text-amber-500">Cart</span>
        </Link>
        <div>
          <p className="max-w-sm font-serif text-3xl leading-snug text-stone-900 dark:text-white">
            Discover unique products from independent vendors worldwide.
          </p>
          <p className="mt-4 text-sm text-stone-500">Curated quality. Artisan craft. Direct to you.</p>
        </div>
        <p className="text-xs text-stone-400">&copy; {new Date().getFullYear()} NexCart</p>
      </div>
      <div className="flex w-full items-center justify-center px-6 lg:w-1/2">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex justify-center lg:hidden">
            <Link href="/" className="font-serif text-2xl text-stone-900 dark:text-white">
              Nex<span className="font-normal italic text-amber-700">Cart</span>
            </Link>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
