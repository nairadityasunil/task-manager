import { useState, useCallback, useRef, useEffect } from 'react';
import { Send, X } from 'lucide-react';
import type { ChatMessage } from '@/types/chat';

interface ChatInputProps {
  onSendMessage: (content: string) => void;
  onTypingStart: () => void;
  onTypingStop: () => void;
  replyingTo: ChatMessage | null;
  onCancelReply: () => void;
  disabled?: boolean;
  placeholder?: string;
}

const MAX_MESSAGE_LENGTH = 4000;

function ChatInput({
  onSendMessage,
  onTypingStart,
  onTypingStop,
  replyingTo,
  onCancelReply,
  disabled = false,
  placeholder = 'Type a message...'
}: ChatInputProps) {
  const [content, setContent] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTypingTimeRef = useRef<number>(0);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 150)}px`;
    }
  }, [content]);

  // Focus when replying to changes
  useEffect(() => {
    if (replyingTo) {
      textareaRef.current?.focus();
    }
  }, [replyingTo]);

  // Handle typing with debounce
  const handleTyping = useCallback(() => {
    const now = Date.now();
    lastTypingTimeRef.current = now;

    if (!isTyping) {
      setIsTyping(true);
      onTypingStart();
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout
    typingTimeoutRef.current = setTimeout(() => {
      if (Date.now() - lastTypingTimeRef.current >= 2000) {
        setIsTyping(false);
        onTypingStop();
      }
    }, 2000);
  }, [isTyping, onTypingStart, onTypingStop]);

  // Handle input change
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const value = e.target.value;
      if (value.length <= MAX_MESSAGE_LENGTH) {
        setContent(value);
        handleTyping();
      }
    },
    [handleTyping]
  );

  // Handle submit
  const handleSubmit = useCallback(() => {
    const trimmed = content.trim();
    if (!trimmed || disabled) return;

    onSendMessage(trimmed);
    setContent('');

    // Clear typing state
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    setIsTyping(false);
    onTypingStop();

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [content, disabled, onSendMessage, onTypingStop]);

  // Handle key down
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  const characterCount = content.length;
  const isNearLimit = characterCount > MAX_MESSAGE_LENGTH * 0.9;
  const isAtLimit = characterCount >= MAX_MESSAGE_LENGTH;

  const canSend = Boolean(content.trim()) && !disabled && !isAtLimit;

  return (
    <div className="bg-white">
      {/* Reply preview */}
      {replyingTo && (
        <div className="mb-2 flex items-center gap-3 rounded-lg border-l-2 border-slate-900 bg-slate-50 py-2 pl-3 pr-1.5">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-slate-500">Replying to</span>
              <span className="truncate font-medium text-slate-900">
                {replyingTo.sender?.name || replyingTo.sender?.email}
              </span>
            </div>
            <div className="truncate text-xs text-slate-500">
              "{replyingTo.content}"
            </div>
          </div>
          <button
            aria-label="Cancel reply"
            onClick={onCancelReply}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-200/60 hover:text-slate-700"
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Input area */}
      <div className="flex items-end gap-2">
        <div className="relative flex-1">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            rows={1}
            className={[
              'block w-full resize-none rounded-lg border border-slate-300 bg-white py-2.5 pl-3 pr-14 text-sm leading-5 text-slate-900 shadow-sm transition-colors',
              'placeholder:text-slate-400',
              'focus:border-slate-900 focus:outline-none focus:ring-4 focus:ring-slate-900/10',
              'disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-60'
            ].join(' ')}
            style={{ minHeight: '42px', maxHeight: '150px' }}
          />

          {/* Character count */}
          <div
            className={[
              'pointer-events-none absolute bottom-3 right-3 text-[11px] tabular-nums transition-opacity duration-200',
              isAtLimit
                ? 'text-red-600'
                : isNearLimit
                  ? 'text-amber-600'
                  : 'text-slate-400',
              content.length === 0 ? 'opacity-0' : 'opacity-100'
            ].join(' ')}
          >
            {characterCount}
          </div>
        </div>

        {/* Send button */}
        <button
          aria-label="Send message"
          onClick={handleSubmit}
          disabled={!content.trim() || disabled || isAtLimit}
          className={[
            'inline-flex h-[42px] w-[42px] flex-shrink-0 items-center justify-center rounded-lg transition-colors',
            canSend
              ? 'bg-slate-900 text-white shadow-sm hover:bg-slate-800'
              : 'cursor-not-allowed bg-slate-100 text-slate-400'
          ].join(' ')}
          type="button"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export default ChatInput;
