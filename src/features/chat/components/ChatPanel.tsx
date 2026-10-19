import {
  useState,
  useCallback,
  useEffect,
  useRef,
  useMemo,
} from 'react';
import {
  MessageSquare,
  Search,
  Bell,
  BellOff,
  Loader2,
  Users,
  X,
} from 'lucide-react';
import type { ChatMessage as ChatMessageType } from '@/types/chat';
import type { Project, ProjectMember } from '@/types/project';
import { useAuth } from '@/context/AuthContext';
import { useChat } from '@/context/ChatContext';
import {
  searchMessages,
} from '@/services/chat';
import { useDebounce } from '@/hooks/useDebounce';
import ChatMessage from '@/components/ChatMessage';
import ChatInput from '@/components/ChatInput';
import { Button, cn, inputClass } from '@/components/ui';

export interface ChatPanelProps {
  project: Project;
  members: ProjectMember[];
  isOpen: boolean;
  onClose: () => void;
}

export function ChatPanel({ project, members, isOpen, onClose }: ChatPanelProps) {
  const { user } = useAuth();
  const {
    messages,
    isLoading,
    hasMore,
    isConnected,
    notificationsEnabled,
    setNotificationsEnabled,
    sendMessage,
    editMessage,
    deleteMessage,
    addReaction,
    removeReaction,
    loadMoreMessages,
    markAsRead,
    startTyping,
    stopTyping,
    typingUsers,
    setActiveProject,
  } = useChat();

  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 500);
  const [searchResults, setSearchResults] = useState<ChatMessageType[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const currentUserId = user?.id ?? '';
  const isAdmin = project.currentUserRole === 'ADMIN';

  // Set active project for context
  useEffect(() => {
    setActiveProject(project);
    return () => setActiveProject(null);
  }, [project, setActiveProject]);

  const lastScrollHeightRef = useRef<number>(0);
  const isAtBottomRef = useRef<boolean>(true);
  const prevMessagesLength = useRef<number>(messages.length);

  // Mark as read when messages load or change
  useEffect(() => {
    markAsRead();
  }, [messages, markAsRead]);

  // Handle scroll position maintenance and smart scroll-to-bottom
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const messageCountDiff = messages.length - prevMessagesLength.current;

    if (messageCountDiff > 0 && container.scrollTop < 50 && lastScrollHeightRef.current > 0) {
      const newScrollHeight = container.scrollHeight;
      container.scrollTop = newScrollHeight - lastScrollHeightRef.current;
    } else if (messageCountDiff > 0 && (isAtBottomRef.current || messages[messages.length - 1].senderId === currentUserId)) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }

    prevMessagesLength.current = messages.length;
  }, [messages, currentUserId]);

  // Infinite scroll up handler
  const handleScroll = () => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    isAtBottomRef.current = scrollHeight - scrollTop - clientHeight < 100;

    if (scrollTop === 0 && hasMore && !isLoading) {
      lastScrollHeightRef.current = scrollHeight;
      void loadMoreMessages();
    }
  };

  // Search execution
  const handleSearch = useCallback(async () => {
    if (!debouncedSearchQuery.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    try {
      const results = await searchMessages(project.id, debouncedSearchQuery.trim());
      setSearchResults(results.messages);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsSearching(false);
    }
  }, [project.id, debouncedSearchQuery]);

  useEffect(() => {
    void handleSearch();
  }, [handleSearch]);

  const [replyingTo, setReplyingTo] = useState<ChatMessageType | null>(null);

  const activeTypingUsers = useMemo(
    () => Array.from(typingUsers.values()).filter(u => u.userId !== currentUserId),
    [typingUsers, currentUserId]
  );

  if (!isOpen) return null;

  return (
    <div className="relative flex h-full min-h-0 flex-col bg-white">
      {/* Header */}
      <div className="z-10 flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3 sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-600">
            <MessageSquare size={17} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="m-0 truncate text-[15px] font-semibold text-slate-900">
                {project.name}
              </h3>
              <span
                className={cn('h-2 w-2 shrink-0 rounded-full', isConnected ? 'bg-emerald-500' : 'bg-amber-400')}
                title={isConnected ? 'Connected' : 'Reconnecting...'}
              />
            </div>
            <p className="m-0 truncate text-xs text-slate-500">
              {members.length} member{members.length === 1 ? '' : 's'}
              <span className="mx-1.5 text-slate-300">·</span>
              {isConnected ? 'Connected' : 'Reconnecting...'}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <Button
            aria-label="Search channel history"
            aria-pressed={showSearch}
            className={showSearch ? 'bg-slate-100 text-slate-900' : ''}
            icon={Search}
            onClick={() => setShowSearch(!showSearch)}
            size="icon-sm"
            title="Search channel history"
            variant="ghost"
          />
          <Button
            aria-label={notificationsEnabled ? 'Mute notifications' : 'Enable notifications'}
            icon={notificationsEnabled ? Bell : BellOff}
            onClick={() => setNotificationsEnabled(!notificationsEnabled)}
            size="icon-sm"
            title={notificationsEnabled ? 'Mute notifications' : 'Enable notifications'}
            variant="ghost"
          />
          <Button
            aria-label="Close chat"
            icon={X}
            onClick={onClose}
            size="icon-sm"
            title="Close chat"
            variant="ghost"
          />
        </div>
      </div>

      {/* Search Input Banner */}
      {showSearch && (
        <div className="shrink-0 border-b border-slate-200 bg-slate-50 px-4 py-2.5 sm:px-5">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
            <input
              autoFocus
              type="text"
              placeholder="Search in message history..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className={cn(inputClass, 'pl-9')}
            />
          </div>
        </div>
      )}

      {/* Main Messages scroll list */}
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-4 custom-scrollbar sm:px-5"
      >
        {isLoading && hasMore && (
          <div className="flex justify-center py-2">
            <Loader2 className="animate-spin text-slate-500" size={18} />
          </div>
        )}

        {showSearch && searchQuery.trim() ? (
          <div>
            <div className="mb-3 text-[13px] font-medium text-slate-500">
              Search Results ({searchResults.length})
            </div>
            {isSearching ? (
              <div className="flex items-center justify-center gap-2 py-6 text-[13px] text-slate-500">
                <Loader2 className="animate-spin text-slate-400" size={16} />
                Searching…
              </div>
            ) : searchResults.length === 0 ? (
              <div className="py-8 text-center text-[13px] text-slate-500">
                No matching messages found
              </div>
            ) : (
              searchResults.map(msg => (
                <ChatMessage
                  key={msg.id}
                  message={msg}
                  currentUserId={currentUserId}
                  currentUserEmail={user?.email}
                  isAdmin={isAdmin}
                  onEdit={editMessage}
                  onDelete={deleteMessage}
                  onAddReaction={addReaction}
                  onRemoveReaction={removeReaction}
                  onReply={msgToReply => setReplyingTo(msgToReply)}
                />
              ))
            )}
          </div>
        ) : (
          <>
            {messages.length === 0 ? (
              isLoading ? (
                <div className="flex h-full items-center justify-center gap-2 py-12 text-[13px] text-slate-500">
                  <Loader2 className="animate-spin text-slate-400" size={16} />
                  Loading messages…
                </div>
              ) : (
                <div className="flex h-full flex-col items-center justify-center py-12 text-center">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
                    <Users size={18} className="text-slate-400" />
                  </div>
                  <p className="m-0 text-sm font-medium text-slate-900">No chat messages yet</p>
                  <p className="m-0 mt-1 text-[13px] text-slate-500">Start the conversation with your team!</p>
                </div>
              )
            ) : (
              messages.map(msg => (
                <ChatMessage
                  key={msg.id}
                  message={msg}
                  currentUserId={currentUserId}
                  currentUserEmail={user?.email}
                  isAdmin={isAdmin}
                  onEdit={editMessage}
                  onDelete={deleteMessage}
                  onAddReaction={addReaction}
                  onRemoveReaction={removeReaction}
                  onReply={msgToReply => setReplyingTo(msgToReply)}
                />
              ))
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Typing Indicator Bar */}
      {activeTypingUsers.length > 0 && (
        <div className="flex shrink-0 items-center gap-1.5 bg-white px-4 py-1 text-xs text-slate-500 sm:px-5">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
          <span>
            {activeTypingUsers.map(u => u.userName).join(', ')} {activeTypingUsers.length === 1 ? 'is' : 'are'} typing...
          </span>
        </div>
      )}

      {/* Chat Input Container */}
      <div className="shrink-0 border-t border-slate-200 bg-white px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-5">
        <ChatInput
          onSendMessage={(content) => {
            sendMessage(content, replyingTo?.id);
            setReplyingTo(null);
          }}
          onTypingStart={startTyping}
          onTypingStop={stopTyping}
          replyingTo={replyingTo}
          onCancelReply={() => setReplyingTo(null)}
        />
      </div>
    </div>
  );
}

export default ChatPanel;
