'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, FileText, LayoutDashboard, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

const bottomNavLinks = [
  { href: '/', icon: Home, label: 'Home' },
  { href: '/proposals', icon: FileText, label: 'Proposals' },
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/verify', icon: User, label: 'Profile' },
];

export function MobileNav() {
  const pathname = usePathname();
  const { user, loading } = useAuth();

  // Only show on mobile when authenticated
  if (loading || !(user as any)?.authenticated) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 hidden md:hidden glass border-t border-omnom-gold/[0.06] pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around h-16 px-2 pt-1">
        {bottomNavLinks.map((link) => {
          const isActive =
            pathname === link.href ||
            (link.href !== '/' && pathname.startsWith(link.href + '/')) ||
            (link.href === '/' && pathname === '/');
          const Icon = link.icon;

          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-all duration-200 min-w-[56px]',
                isActive
                  ? 'text-omnom-gold'
                  : 'text-omnom-muted hover:text-omnom-text-secondary'
              )}
            >
              <div className="relative">
                <Icon className={cn('h-5 w-5 transition-all duration-200', isActive && 'drop-shadow-[0_0_6px_rgba(255,215,0,0.5)]')} />
                {isActive && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-0.5 w-4 rounded-full bg-omnom-gold" />
                )}
              </div>
              <span className={cn(
                'text-[10px] font-medium transition-colors',
                isActive ? 'text-omnom-gold' : 'text-omnom-muted'
              )}>
                {link.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
