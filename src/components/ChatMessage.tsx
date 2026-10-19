import { useState, useCallback, useMemo, useRef } from 'react';
import {
  Edit2,
  Trash2,
  Smile,
  CornerDownRight,
  MoreHorizontal,
  Check,
  X,
} from 'lucide-react';
import type { ChatMessage, MessageSender, MessageReaction } from '@/types/chat';
import { MessageType } from '@/types/chat';
import { formatDate } from '@/utils/date';
import { useConfirm } from '@/context/ConfirmationContext';

interface ChatMessageProps {
  message: ChatMessage;
  currentUserId: string;
  currentUserEmail?: string;
  isAdmin: boolean;
  onEdit: (messageId: string, content: string) => void;
  onDelete: (messageId: string) => void;
  onAddReaction: (messageId: string, emoji: string) => void;
  onRemoveReaction: (messageId: string, emoji: string) => void;
  onReply: (message: ChatMessage) => void;
  onLoadThread?: (messageId: string) => void;
  allMessages?: ChatMessage[];
  depth?: number;
}

// Common emoji reactions
const QUICK_REACTIONS = ['👍', '👎', '❤️', '😄', '😮', '🎉', '👀', '🚀'];

// Format date for display
const formatTime = (dateString: string): string => formatDate(dateString, 'time');

// Get user initials for avatar
const getInitials = (user: MessageSender | null): string => {
  if (!user) return '?';
  if (user.name) {
    return user.name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }
  return user.email.slice(0, 2).toUpperCase();
};

// Get avatar color based on user ID
const getAvatarColor = (userId: string | null): string => {
  if (!userId) return 'bg-slate-400';
  const colors = [
    'bg-slate-600',
    'bg-emerald-600',
    'bg-sky-600',
    'bg-amber-600',
    'bg-teal-600',
    'bg-rose-600',
    'bg-cyan-700',
    'bg-slate-500'
  ];
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

// Group reactions by emoji
const groupReactions = (reactions: MessageReaction[]): Map<string, string[]> => {
  const grouped = new Map<string, string[]>();
  reactions.forEach((reaction) => {
    const users = grouped.get(reaction.emoji) || [];
    users.push(reaction.userId);
    grouped.set(reaction.emoji, users);
  });
  return grouped;
};

function ChatMessageComponent({
  message,
  currentUserId,
  currentUserEmail,
  isAdmin,
  onEdit,
  onDelete,
  onAddReaction,
  onRemoveReaction,
  onReply,
  onLoadThread,
  allMessages = [],
  depth = 0,
}: ChatMessageProps) {
  const confirm = useConfirm();
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const emojiButtonRef = useRef<HTMLButtonElement>(null);
  const [emojiPickerPos, setEmojiPickerPos] = useState<{ top: number; left: number } | null>(null);

  const replies = useMemo(() => {
    return allMessages.filter((m) => m.replyToId === message.id);
  }, [allMessages, message.id]);

  const sortedReplies = useMemo(() => {
    return [...replies].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [replies]);
  const isOwnMessage = 
    message.senderId === currentUserId || 
    (currentUserEmail && message.sender?.email?.toLowerCase() === currentUserEmail.toLowerCase());
  const isSystemMessage = message.type === MessageType.SYSTEM;
  const isDeleted = message.isDeleted;

  // Can edit?
  const canEdit = isOwnMessage && !isDeleted && !isSystemMessage;
  const canDelete = !isDeleted && !isSystemMessage && (isOwnMessage || isAdmin);

  // Group reactions
  const groupedReactions = useMemo(() => groupReactions(message.reactions), [message.reactions]);
  const userReactions = useMemo(
    () => message.reactions.filter((r) => r.userId === currentUserId).map((r) => r.emoji),
    [message.reactions, currentUserId]
  );

  // Sync editContent when message content changes OR when editing is toggled
  const handleStartEdit = useCallback(() => {
    setEditContent(message.content);
    setIsEditing(true);
    setShowActions(false);
  }, [message.content]);

  // Handle edit submit
  const handleEditSubmit = useCallback(() => {
    const trimmed = editContent.trim();
    if (trimmed && trimmed !== message.content) {
      onEdit(message.id, trimmed);
    }
    setIsEditing(false);
  }, [editContent, message.content, message.id, onEdit]);

  // Handle edit cancel
  const handleEditCancel = useCallback(() => {
    setIsEditing(false);
    setEditContent(message.content);
  }, [message.content]);

  // Handle reaction click
  const handleReactionClick = useCallback(
    (emoji: string) => {
      if (userReactions.includes(emoji)) {
        onRemoveReaction(message.id, emoji);
      } else {
        onAddReaction(message.id, emoji);
      }
      setShowEmojiPicker(false);
    },
    [userReactions, message.id, onAddReaction, onRemoveReaction]
  );

  // Handle delete
  const handleDelete = useCallback(async () => {
    const isConfirmed = await confirm({
      title: 'Delete Message',
      message: 'Are you sure you want to delete this message? This action is irreversible.',
      confirmText: 'Delete',
      type: 'danger'
    });

    if (isConfirmed) {
      onDelete(message.id);
    }
  }, [message.id, onDelete, confirm]);

  // Render system message
  if (isSystemMessage) {
    return (
      <div className="flex items-center gap-3 py-1">
        <div className="h-px flex-1 bg-slate-200" />
        <span className="text-xs text-slate-500">
          {message.content}
          <span className="ml-1.5 text-slate-400">{formatTime(message.createdAt)}</span>
        </span>
        <div className="h-px flex-1 bg-slate-200" />
      </div>
    );
  }

  // Render deleted message
  if (isDeleted) {
    return (
      <div className="flex items-center justify-center py-1">
        <span className="rounded-md bg-slate-50 px-2.5 py-1 text-xs italic text-slate-400">
          Message deleted
        </span>
      </div>
    );
  }

  const iconBtn =
    'inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800';

  return (
    <div
      id={`message-${message.id}`}
      className={[
        'group relative flex w-full gap-2.5 rounded-lg px-1 py-1 sm:gap-3',
        isOwnMessage ? 'flex-row-reverse' : 'flex-row'
      ].join(' ')}
    >
      {/* Avatar */}
      <div
        className={[
          'flex h-8 w-8 flex-shrink-0 select-none items-center justify-center rounded-full text-xs font-semibold text-white',
          getAvatarColor(message.senderId),
        ].join(' ')}
        title={message.sender?.name || message.sender?.email || 'Unknown'}
      >
        {getInitials(message.sender)}
      </div>

      {/* Message content */}
      <div className={['flex min-w-0 max-w-[80%] flex-col', isOwnMessage ? 'items-end' : 'items-start'].join(' ')}>
        {/* Name + time */}
        <div className={['mb-1 flex max-w-full items-baseline gap-2 px-0.5', isOwnMessage ? 'flex-row-reverse' : ''].join(' ')}>
          <span className="truncate text-[13px] font-medium text-slate-900">
            {message.sender?.name || 'Unknown'}
          </span>
          <span className="shrink-0 text-xs text-slate-400">
            {formatTime(message.createdAt)}
            {message.isEdited && <span className="ml-1">(edited)</span>}
          </span>
        </div>

        {/* The bubble */}
        <div className="relative max-w-full">
          {isEditing ? (
            <div className="flex w-[min(320px,70vw)] flex-col gap-2 rounded-xl border border-slate-300 bg-white p-2 shadow-sm">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full resize-none rounded-lg border-0 bg-transparent px-2 py-1.5 text-sm text-slate-900 outline-none"
                rows={3}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleEditSubmit();
                  }
                  if (e.key === 'Escape') {
                    handleEditCancel();
                  }
                }}
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={handleEditCancel}
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-[13px] font-medium text-slate-600 transition-colors hover:bg-slate-100"
                  type="button"
                >
                  <X className="h-3.5 w-3.5" />
                  Cancel
                </button>
                <button
                  onClick={handleEditSubmit}
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-slate-900 px-3 text-[13px] font-medium text-white transition-colors hover:bg-slate-800"
                  type="button"
                >
                  <Check className="h-3.5 w-3.5" />
                  Save
                </button>
              </div>
            </div>
          ) : (
            <div
              className={[
                'rounded-2xl px-3.5 py-2',
                isOwnMessage
                  ? 'rounded-tr-md bg-slate-900 text-white'
                  : 'rounded-tl-md border border-slate-200 bg-white text-slate-800'
              ].join(' ')}
            >
              {/* Reply preview inside bubble */}
              {message.replyTo && (
                <div
                  className={[
                    'mb-2 flex cursor-pointer items-center gap-2 rounded-md border-l-2 px-2 py-1.5 text-xs transition-colors',
                    isOwnMessage ? 'border-white/40 bg-white/10 text-white/80 hover:bg-white/15' : 'border-slate-300 bg-slate-50 text-slate-500 hover:bg-slate-100'
                  ].join(' ')}
                  onClick={() => onLoadThread?.(message.replyTo!.id)}
                >
                  <CornerDownRight className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{message.replyTo.content}</span>
                </div>
              )}

              <div className="whitespace-pre-wrap text-sm leading-relaxed" style={{ wordBreak: 'break-word' }}>
                {message.content}
              </div>
            </div>
          )}
        </div>

        {/* Reactions */}
        {groupedReactions.size > 0 && (
          <div className={['mt-1.5 flex flex-wrap gap-1', isOwnMessage ? 'justify-end' : ''].join(' ')}>
            {Array.from(groupedReactions.entries()).map(([emoji, users]) => {
              const hasReacted = userReactions.includes(emoji);
              return (
                <button
                  key={emoji}
                  onClick={() => handleReactionClick(emoji)}
                  className={[
                    'flex h-7 items-center gap-1.5 rounded-full border px-2 text-xs font-medium transition-colors',
                    hasReacted
                      ? 'border-slate-300 bg-slate-100 text-slate-800'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                  ].join(' ')}
                  title={`Reacted by ${users.length} user${users.length > 1 ? 's' : ''}`}
                  type="button"
                >
                  <span className="text-sm leading-none">{emoji}</span>
                  <span className="tabular-nums">{users.length}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Reply count indicator */}
        {message.replyCount > 0 && (
          <button
            onClick={() => onLoadThread?.(message.id)}
            className={[
              'mt-1.5 flex items-center gap-1.5 text-xs font-medium text-slate-600 transition-colors hover:text-slate-900',
              isOwnMessage ? 'justify-end' : ''
            ].join(' ')}
            type="button"
          >
            <CornerDownRight className="h-3.5 w-3.5" />
            {message.replyCount} {message.replyCount === 1 ? 'reply' : 'replies'}
          </button>
        )}
      </div>

      {/* Actions */}
      {!isEditing && (
        <div
          className={[
            'flex items-start pt-5 transition-opacity',
            '[@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:focus-within:opacity-100',
            showActions || showEmojiPicker ? '[@media(hover:hover)]:opacity-100' : ''
          ].join(' ')}
        >
          <div className="flex rounded-lg border border-slate-200 bg-white p-0.5 shadow-sm">
            {/* Emoji toggle icon */}
            <div className="relative">
              <button
                ref={emojiButtonRef}
                onClick={() => {
                  if (!showEmojiPicker && emojiButtonRef.current) {
                    const rect = emojiButtonRef.current.getBoundingClientRect();
                    setEmojiPickerPos({
                      top: rect.top - 8,
                      left: Math.max(8, Math.min(rect.left - 120, window.innerWidth - 200)),
                    });
                  }
                  setShowEmojiPicker(!showEmojiPicker);
                }}
                className={iconBtn}
                title="Add reaction"
                type="button"
              >
                <Smile size={15} />
              </button>

              {showEmojiPicker && emojiPickerPos && (
                <>
                  <div className="fixed inset-0 z-[6000]" onClick={() => setShowEmojiPicker(false)} />
                  <div
                    className="fixed z-[6001] rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg"
                    style={{
                      top: `${emojiPickerPos.top}px`,
                      left: `${emojiPickerPos.left}px`,
                      transform: 'translateY(-100%)'
                    }}
                  >
                    <div className="grid min-w-[176px] grid-cols-4 gap-1">
                      {QUICK_REACTIONS.map((emoji) => (
                        <button
                          key={emoji}
                          onClick={() => handleReactionClick(emoji)}
                          className="flex h-10 w-10 items-center justify-center rounded-lg text-xl transition-colors hover:bg-slate-100"
                          type="button"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            <button
              onClick={() => onReply(message)}
              className={iconBtn}
              title="Reply"
              type="button"
            >
              <CornerDownRight size={15} />
            </button>

            {/* Overflow Actions */}
              <div className="relative">
                <button
                  aria-label="More actions"
                  onClick={() => setShowActions(!showActions)}
                  className={iconBtn}
                  type="button"
                >
                  <MoreHorizontal size={15} />
                </button>

                {showActions && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowActions(false)} />
                    <div className={['absolute top-full z-50 mt-1 min-w-[150px] overflow-hidden rounded-lg border border-slate-200 bg-white p-1 shadow-lg', isOwnMessage ? 'left-0' : 'right-0'].join(' ')}>
                      {canEdit && (
                        <button
                          onClick={handleStartEdit}
                          className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-50"
                          type="button"
                        >
                          <Edit2 size={14} />
                          Edit Message
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={() => {
                            handleDelete();
                            setShowActions(false);
                          }}
                          className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] font-medium text-red-600 transition-colors hover:bg-red-50"
                          type="button"
                        >
                          <Trash2 size={14} />
                          Delete
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
          </div>
        </div>
      )}

      {/* Render replies recursively */}
      {sortedReplies.length > 0 && depth < 5 && (
        <div className="ml-4 mt-2 flex flex-col gap-2 border-l-2 border-slate-100 pl-3">
          {sortedReplies.map((reply) => (
            <ChatMessageComponent
              key={reply.id}
              message={reply}
              currentUserId={currentUserId}
              currentUserEmail={currentUserEmail}
              isAdmin={isAdmin}
              onEdit={onEdit}
              onDelete={onDelete}
              onAddReaction={onAddReaction}
              onRemoveReaction={onRemoveReaction}
              onReply={onReply}
              onLoadThread={onLoadThread}
              allMessages={allMessages}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default ChatMessageComponent;