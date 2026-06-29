// ── Shared formatting utilities ─────────────────────────────────────────
// Database timestamps are Unix seconds; JavaScript Date expects milliseconds.

/**
 * Convert a Unix-seconds timestamp to a JavaScript Date.
 */
export function fromUnix(ts: number): Date {
  return new Date(ts * 1000);
}

/**
 * Format a Unix-seconds timestamp as a human-readable relative string.
 */
export function formatRelativeTime(ts: number): string {
  const diff = Date.now() - ts * 1000;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'just now';
}

/**
 * Format a Unix-seconds timestamp as a full date string.
 */
export function formatFullDate(ts: number): string {
  return new Date(ts * 1000).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/**
 * Format a countdown from a Unix-seconds end timestamp to now.
 */
export function formatCountdown(endsAt: number): string {
  const diff = endsAt * 1000 - Date.now();
  if (diff <= 0) return 'Ended';
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  return `${minutes}m ${seconds}s`;
}

/**
 * Truncate an Ethereum address for display.
 */
export function truncateAddress(address: string): string {
  if (!address) return '0x????';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
