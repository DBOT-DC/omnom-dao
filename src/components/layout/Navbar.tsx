'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Vote, Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { MobileNav } from '@/components/layout/MobileNav';
import { NotificationBell } from '@/components/ui/NotificationBell';

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/proposals', label: 'Proposals' },
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/settings', label: 'Settings' },
  { href: '/verify', label: 'Verify' },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: -8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' as const } },
};

export function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, loading } = useAuth();

  const showNavLinks = !loading && (user as any)?.authenticated;

  return (
    <>
      <motion.header
        initial={false}
        animate={{ y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="sticky top-0 z-50 glass border-b border-omnom-gold/[0.06]"
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 py-2 group">
            <span className="text-2xl transition-transform group-hover:scale-110">🐕</span>
            <span className="text-lg font-bold text-gradient-gold">$OMNOM</span>
          </Link>

          {/* Desktop nav links — staggered entrance */}
          <motion.nav
            variants={containerVariants}
            initial={false}
            animate="visible"
            className="hidden md:flex items-center gap-1"
          >
            {navLinks.map((link) => (
              <motion.div key={link.href} variants={itemVariants}>
                <Link
                  href={link.href}
                  className={cn(
                    'relative rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    pathname === link.href || pathname.startsWith(link.href + '/')
                      ? 'text-omnom-gold font-semibold'
                      : 'text-omnom-text-secondary hover:text-omnom-text'
                  )}
                >
                  {link.label}
                  {/* Active underline indicator */}
                  {(pathname === link.href || pathname.startsWith(link.href + '/')) && (
                    <motion.span
                      layoutId="nav-underline"
                      className="absolute bottom-0 left-1/2 h-0.5 w-6 -translate-x-1/2 rounded-full bg-omnom-gold"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                </Link>
              </motion.div>
            ))}
          </motion.nav>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {!loading && (user as any)?.authenticated && (
              <motion.div
                initial={false}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
                className="hidden sm:flex items-center gap-2"
              >
                <Link
                  href="/proposals/create"
                  className="flex items-center gap-1.5 rounded-full bg-omnom-gold px-4 py-2 text-sm font-semibold text-omnom-dark hover:bg-omnom-gold/90 transition-colors"
                >
                  <Vote className="h-3.5 w-3.5" />
                  Create Proposal
                </Link>
              </motion.div>
            )}

            {/* Notification bell — desktop only */}
            <div className="hidden md:block">
              <NotificationBell />
            </div>

            <div className="min-h-[44px] flex items-center">
              <ConnectButton
                chainStatus="name"
                accountStatus={{
                  smallScreen: 'avatar',
                  largeScreen: 'full',
                }}
                showBalance={false}
              />
            </div>

            {/* Mobile hamburger */}
            <button
              className="md:hidden flex items-center justify-center h-11 w-11 rounded-lg text-omnom-muted hover:text-omnom-text-secondary hover:bg-omnom-surface-elevated transition-colors"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            >
              <AnimatePresence mode="wait">
                {mobileOpen ? (
                  <motion.span
                    key="close"
                    initial={false}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: 90, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    <X className="h-5 w-5" />
                  </motion.span>
                ) : (
                  <motion.span
                    key="menu"
                    initial={false}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: -90, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    <Menu className="h-5 w-5" />
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          </div>
        </div>

        {/* Mobile slide-down menu */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={false}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="md:hidden border-t border-omnom-gold/10 overflow-hidden"
            >
              <motion.div
                variants={containerVariants}
                initial={false}
                animate="visible"
                className="px-4 py-3 space-y-1"
              >
                {navLinks.map((link) => (
                  <motion.div key={link.href} variants={itemVariants}>
                    <Link
                      href={link.href}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        'block rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                        pathname === link.href || pathname.startsWith(link.href + '/')
                          ? 'text-omnom-gold bg-omnom-gold/10'
                          : 'text-omnom-muted hover:text-omnom-text hover:bg-omnom-surface'
                      )}
                    >
                      {link.label}
                    </Link>
                  </motion.div>
                ))}
                {showNavLinks && (
                  <motion.div variants={itemVariants}>
                    <Link
                      href="/proposals/create"
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center justify-center gap-1.5 rounded-full bg-omnom-gold px-4 py-2.5 text-sm font-semibold text-omnom-dark"
                    >
                      <Vote className="h-3.5 w-3.5" />
                      Create Proposal
                    </Link>
                  </motion.div>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.header>

      {/* Mobile bottom nav */}
      <MobileNav />
    </>
  );
}
