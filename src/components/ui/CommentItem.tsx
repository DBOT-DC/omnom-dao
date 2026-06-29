'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Reply, Trash2, ChevronDown, ChevronRight, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatRelativeTime, truncateAddress } from '@/lib/format';
import type { Comment } from '@/types';

interface CommentItemProps {
  comment: Comment;
  replies?: Comment[];
  currentAddress?: string;
  onReply?: (commentId: string) => void;
  onDelete?: (commentId: string) => void;
  depth?: number;
  className?: string;
}

function AvatarPlaceholder({ address, size = 'md' }: { address: string; size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = { sm: 'h-6 w-6 text-[10px]', md: 'h-8 w-8 text-xs', lg: 'h-10 w-10 text-sm' };

  return (
    <div className={cn(
      'flex items-center justify-center rounded-full bg-gradient-to-br from-omnom-gold/20 to-omnom-purple/20 ring-1 ring-omnom-gold/10 font-mono font-bold text-omnom-gold',
      sizeClasses[size]
    )}>
      {address ? address.slice(2, 4).toUpperCase() : '??'}
    </div>
  );
}

export function CommentItem({
  comment,
  replies = [],
  currentAddress,
  onReply,
  onDelete,
  depth = 0,
  className,
}: CommentItemProps) {
  const [expanded, setExpanded] = useState(true);
  const isOwnComment = currentAddress?.toLowerCase() === comment.author_address?.toLowerCase();
  const isDeleted = comment.deleted_at !== null;

  const handleDelete = useCallback(() => {
    if (onDelete && isOwnComment && !isDeleted) {
      onDelete(comment.id);
    }
  }, [onDelete, comment.id, isOwnComment, isDeleted]);

  const handleReply = useCallback(() => {
    if (onReply && !isDeleted) {
      onReply(comment.id);
    }
  }, [onReply, comment.id, isDeleted]);

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2 }}
      className={cn(
        'group',
        depth > 0 && 'ml-6 sm:ml-8 border-l-2 border-omnom-gold/10 pl-4',
        className
      )}
    >
      {/* Main comment */}
      <div className="flex gap-3 py-3">
        <AvatarPlaceholder address={comment.author_address} />

        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-2 mb-1">
            <Link
              href={`/verify/${comment.author_address}`}
              className="font-mono text-xs font-medium text-omnom-gold hover:underline truncate"
            >
              {truncateAddress(comment.author_address)}
            </Link>
            <span className="text-[10px] text-omnom-muted font-mono">
              {formatRelativeTime(comment.created_at)}
            </span>
            {depth > 0 && (
              <span className="text-[10px] text-omnom-muted/60">replied</span>
            )}
          </div>

          {/* Content */}
          {isDeleted ? (
            <div className="flex items-center gap-2 py-2 text-omnom-muted/60 italic">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              <span className="text-sm">This comment has been deleted</span>
            </div>
          ) : (
            <p className="text-sm text-omnom-text leading-relaxed whitespace-pre-wrap break-words">
              {comment.content}
            </p>
          )}

          {/* Actions */}
          {!isDeleted && (
            <div className="flex items-center gap-3 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={handleReply}
                className="flex items-center gap-1 text-xs text-omnom-muted hover:text-omnom-gold transition-colors"
              >
                <Reply className="h-3 w-3" />
                Reply
              </button>
              {isOwnComment && (
                <button
                  onClick={handleDelete}
                  className="flex items-center gap-1 text-xs text-omnom-muted hover:text-red-400 transition-colors"
                >
                  <Trash2 className="h-3 w-3" />
                  Delete
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Nested replies */}
      {replies.length > 0 && (
        <div className="relative">
          {/* Expand/collapse toggle for deep threads */}
          {replies.length > 2 && depth === 0 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 mb-1 text-xs font-medium text-omnom-gold/70 hover:text-omnom-gold transition-colors"
            >
              {expanded ? (
                <ChevronDown className="h-3.5 w-3.5" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5" />
              )}
              {expanded ? 'Hide' : 'Show'} {replies.length} repl{replies.length !== 1 ? 'ies' : 'y'}
            </button>
          )}

          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                {replies.map((reply) => (
                  <CommentItem
                    key={reply.id}
                    comment={reply}
                    currentAddress={currentAddress}
                    onReply={onReply}
                    onDelete={onDelete}
                    depth={depth + 1}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}
