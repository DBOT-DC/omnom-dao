import { NextRequest, NextResponse } from 'next/server';
import {
  initDatabase,
  getUserByWallet,
  getUserNotifications,
  markAllNotificationsRead,
} from '@/lib/database';
import { getSession } from '@/lib/auth';

// ── GET: List user notifications ──────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    await initDatabase();

    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Look up user by wallet to get user ID
    const user = await getUserByWallet(session.sub);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));
    const onlyUnread = searchParams.get('unread') === 'true';
    const cursor = searchParams.get('cursor')
      ? parseInt(searchParams.get('cursor')!, 10)
      : undefined;

    let notifications = await getUserNotifications(user.id, limit);

    // Filter unread on the application side if requested
    // (the DB query returns all; we filter here for simplicity)
    if (onlyUnread) {
      notifications = notifications.filter((n) => !n.read);
    }

    // Filter by cursor (return only notifications older than cursor timestamp)
    if (cursor) {
      notifications = notifications.filter((n) => n.created_at < cursor);
    }

    return NextResponse.json({ notifications });
  } catch (error) {
    console.error('Notifications fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}

// ── POST: Mark all notifications as read ─────────────────────────────

export async function POST() {
  try {
    await initDatabase();

    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const user = await getUserByWallet(session.sub);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const marked = await markAllNotificationsRead(user.id);

    return NextResponse.json({ marked });
  } catch (error) {
    console.error('Mark all read error:', error);
    return NextResponse.json(
      { error: 'Failed to mark notifications read' },
      { status: 500 }
    );
  }
}
