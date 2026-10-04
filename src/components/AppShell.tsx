'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { useWardrobe, WardrobeProvider } from '@/lib/state/WardrobeProvider';

const NAV = [
  { href: '/', label: 'Today' },
  { href: '/closet', label: 'Closet' },
  { href: '/saved', label: 'Saved' },
  { href: '/diary', label: 'Diary' },
  { href: '/missing', label: 'Missing piece' },
];

function Header() {
  const path = usePathname();
  return (
    <header className="mx-auto flex max-w-6xl flex-wrap items-end justify-between gap-x-8 gap-y-3 px-4 pt-6 pb-4 sm:px-6">
      <Link href="/" className="display text-4xl sm:text-5xl" aria-label="Rack, today's looks">
        Rack
      </Link>
      <nav aria-label="Main">
        <ul className="flex flex-wrap gap-x-5 gap-y-1 text-[0.95rem] font-medium">
          {NAV.map(({ href, label }) => {
            const active = href === '/' ? path === '/' : path.startsWith(href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? 'page' : undefined}
                  className={`inline-block py-2 underline-offset-[6px] ${
                    active ? 'underline decoration-chalk decoration-[5px]' : 'hover:underline hover:decoration-2'
                  }`}
                >
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </header>
  );
}

function Body({ children }: { children: ReactNode }) {
  const { status } = useWardrobe();
  if (status === 'loading') {
    return (
      <p className="py-16 text-muted" aria-busy="true">
        Opening your closet…
      </p>
    );
  }
  if (status === 'error') {
    return (
      <div role="alert" aria-live="assertive" className="max-w-xl py-16">
        <h1 className="display text-4xl">Your closet didn&apos;t open</h1>
        <p className="mt-4 text-lg">Something went wrong reading this browser&apos;s storage. Reload the page to try again.</p>
      </div>
    );
  }
  if (status === 'unavailable') {
    return (
      <div role="alert" aria-live="assertive" className="max-w-xl py-16">
        <h1 className="display text-4xl">Storage is switched off</h1>
        <p className="mt-4 text-lg">
          Rack keeps your closet in this browser, and this window isn&apos;t allowing it. Private or incognito windows
          often block storage. Open Rack in a normal window to continue.
        </p>
      </div>
    );
  }
  return <>{children}</>;
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <WardrobeProvider>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded focus:bg-ink focus:px-4 focus:py-2 focus:text-calico"
      >
        Skip to content
      </a>
      <Header />
      <main id="main" tabIndex={-1} className="mx-auto max-w-6xl px-4 pb-24 sm:px-6 focus:outline-none">
        <Body>{children}</Body>
      </main>
    </WardrobeProvider>
  );
}
