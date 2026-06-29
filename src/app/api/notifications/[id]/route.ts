import { NextRequest, NextResponse } from 'next/server';
import {
  initDatabase,
  getUserByWallet,
  getUserNotifications,
  markNotificationRead,
} from '@/lib/database';
import { getSession } from '@/lib/auth';

// ── POST: Mark single notification as read ──────────────────────────

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await initDatabase();

    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { id: notificationId } = await params;

    // Look up user by wallet to verify ownership
    const user = await getUserByWallet(session.sub);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Verify the notification belongs to this user
    const notifications = await getUserNotifications(user.id, 1000);
    const notification = notifications.find((n) => n.id === notificationId);

    if (!notification) {
      return NextResponse.json(
        { error: 'Notification not found' },
        { status: 404 }
      );
    }

    // Already read
    if (notification.read) {
      return NextResponse.json({ read: true });
    }

    const marked = await markNotificationRead(notificationId);

    return NextResponse.json({ read: marked });
  } catch (error) {
    console.error('Mark notification read error:', error);
    return NextResponse.json(
      { error: 'Failed to mark notification read' },
      { status: 500 }
    );
  }
}
