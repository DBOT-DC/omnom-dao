'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Check, CheckCheck, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import type { Notification } from '@/types';

interface NotificationBellProps {
  className?: string;
}

// Reusable hook for fetching notifications
function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications');
      if (res.ok) {
        const data = await res.json();
        const notifs: Notification[] = Array.isArray(data) ? data : data.notifications ?? [];
        setNotifications(notifs);
        setUnreadCount(notifs.filter((n: Notification) => !n.read).length);
      }
    } catch {
      // Silently fail — bell still works as nav link
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const markAllRead = useCallback(async () => {
    try {
      await fetch('/api/notifications', { method: 'POST' });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch {
      // Silently fail
    }
  }, []);

  return { notifications, unreadCount, loading, markAllRead, refetch: fetchNotifications };
}

function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp * 1000;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'just now';
}

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '…';
}

export function NotificationBell({ className }: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { user, loading } = useAuth();
  const isAuthenticated = (user as any)?.authenticated;
  const { notifications, unreadCount, markAllRead } = useNotifications();
  const previewNotifications = notifications.slice(0, 5);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={dropdownRef} className={cn('relative', className)}>
      {/* Bell trigger */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg text-omnom-muted hover:text-omnom-text hover:bg-omnom-surface transition-colors"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
      >
        <Bell className="h-4.5 w-4.5" />
        {/* Animated badge */}
        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.span
              key={unreadCount}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 25 }}
              className="absolute -top-0.5 -right-0.5 flex h-4.5 min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white ring-2 ring-omnom-dark"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Dropdown panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute right-0 top-12 z-50 w-80 rounded-xl border border-omnom-gold/10 bg-omnom-surface shadow-xl shadow-black/20 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-omnom-gold/10">
              <h4 className="text-sm font-semibold text-omnom-text">Notifications</h4>
              {unreadCount > 0 && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={markAllRead}
                  className="flex items-center gap-1 text-xs font-medium text-omnom-gold hover:text-omnom-gold/80 transition-colors"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  Mark all read
                </motion.button>
              )}
            </div>

            {/* Notification list */}
            <div className="max-h-80 overflow-y-auto">
              {!isAuthenticated ? (
                <div className="flex flex-col items-center justify-center py-8 text-omnom-muted">
                  <Bell className="h-8 w-8 mb-2 opacity-40" />
                  <p className="text-sm">Connect wallet to see notifications</p>
                </div>
              ) : previewNotifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-omnom-muted">
                  <Bell className="h-8 w-8 mb-2 opacity-40" />
                  <p className="text-sm">No notifications yet</p>
                </div>
              ) : (
                previewNotifications.map((notification, i) => (
                  <motion.div
                    key={notification.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className={cn(
                      'flex items-start gap-3 px-4 py-3 border-b border-omnom-gold/5 transition-colors hover:bg-omnom-gold/5 cursor-pointer',
                      !notification.read && 'bg-omnom-gold/5'
                    )}
                  >
                    {/* Unread dot */}
                    {!notification.read && (
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-omnom-gold" />
                    )}
                    {notification.read && (
                      <span className="mt-1.5 h-2 w-2 shrink-0" />
                    )}

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-omnom-text truncate">
                        {notification.title}
                      </p>
                      <p className="text-xs text-omnom-muted mt-0.5 truncate">
                        {truncateText(notification.body, 60)}
                      </p>
                      <p className="text-[10px] text-omnom-muted/70 mt-1 font-mono">
                        {formatRelativeTime(notification.created_at)}
                      </p>
                    </div>
                  </motion.div>
                ))
              )}
            </div>

            {/* Footer link */}
            {notifications.length > 0 && (
              <Link
                href="/notifications"
                onClick={() => setIsOpen(false)}
                className="flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-medium text-omnom-gold hover:bg-omnom-gold/5 transition-colors border-t border-omnom-gold/10"
              >
                View all notifications
                <ArrowRight className="h-3 w-3" />
              </Link>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
