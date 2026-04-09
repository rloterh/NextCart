import Link from "next/link";

const footerLinks = {
  shop: [
    { label: "New Arrivals", href: "/shop?sort=newest" },
    { label: "Best Sellers", href: "/shop?sort=popular" },
    { label: "Categories", href: "/categories" },
    { label: "Vendors", href: "/vendors" },
  ],
  support: [
    { label: "Help Center", href: "/help" },
    { label: "Shipping", href: "/shipping" },
    { label: "Returns", href: "/returns" },
    { label: "Contact", href: "/contact" },
  ],
  company: [
    { label: "About", href: "/about" },
    { label: "Sell on NexCart", href: "/sell" },
    { label: "Privacy", href: "/privacy" },
    { label: "Terms", href: "/terms" },
  ],
};

export function StorefrontFooter() {
  return (
    <footer className="border-t border-stone-200 bg-stone-50 dark:border-stone-800 dark:bg-stone-900/30">
      <div className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-5">
          {/* Brand */}
          <div className="lg:col-span-2">
            <span className="font-serif text-2xl tracking-tight text-stone-900 dark:text-white">
              Nex<span className="font-normal italic text-amber-700 dark:text-amber-500">Cart</span>
            </span>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-stone-500 dark:text-stone-400">
              A curated marketplace connecting artisan vendors with discerning buyers.
              Quality craftsmanship, delivered worldwide.
            </p>
            {/* Newsletter */}
            <div className="mt-6">
              <p className="text-xs font-medium uppercase tracking-widest text-stone-500">Newsletter</p>
              <div className="mt-2 flex">
                <input
                  type="email"
                  placeholder="your@email.com"
                  className="h-10 flex-1 border-b border-stone-300 bg-transparent px-0 text-sm placeholder:text-stone-400 focus:border-stone-900 focus:outline-none dark:border-stone-600"
                />
                <button className="h-10 bg-stone-900 px-4 text-xs font-medium uppercase tracking-wider text-white hover:bg-stone-800 dark:bg-stone-100 dark:text-stone-900">
                  Join
                </button>
              </div>
            </div>
          </div>

          {/* Links */}
          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <h4 className="text-xs font-medium uppercase tracking-widest text-stone-900 dark:text-white">
                {title}
              </h4>
              <ul className="mt-4 space-y-2.5">
                {links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-stone-500 transition-colors hover:text-stone-900 dark:text-stone-400 dark:hover:text-white"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-16 flex items-center justify-between border-t border-stone-200 pt-6 dark:border-stone-800">
          <p className="text-xs text-stone-400">
            &copy; {new Date().getFullYear()} NexCart. All rights reserved.
          </p>
          <div className="flex gap-6 text-xs text-stone-400">
            <Link href="/privacy" className="hover:text-stone-900 dark:hover:text-white">Privacy</Link>
            <Link href="/terms" className="hover:text-stone-900 dark:hover:text-white">Terms</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
