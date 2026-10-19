import { useState, useEffect, FormEvent } from 'react';
import { Loader2, Send, MessageSquare } from 'lucide-react';
import { Button, cn, textareaClass } from '@/components/ui';
import { getComments, addComment, type Comment } from '@/services/comments';
import { formatDate } from '@/utils/date';
import UserAvatar from './UserAvatar';

interface CommentSectionProps {
  taskId: string;
}

function CommentSection({ taskId }: CommentSectionProps): JSX.Element {
  const [comments, setComments] = useState<Comment[]>([]);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const loadComments = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getComments(taskId);
        if (isMounted) setComments(data);
      } catch {
        if (isMounted) setError('Unable to load comments.');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadComments();
    return () => { isMounted = false; };
  }, [taskId]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!content.trim() || submitting) return;

    try {
      setSubmitting(true);
      setError(null);
      const newComment = await addComment(taskId, content.trim());
      setComments((prev) => [...prev, newComment]);
      setContent('');
    } catch {
      setError('Unable to post comment.');
    } finally {
      setSubmitting(false);
    }
  };

  const displayDate = (dateString: string) => formatDate(dateString, 'short');

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 pb-3">
        <h3 className="m-0 text-[15px] font-semibold text-slate-900">Comments</h3>
        <span className="rounded-full bg-slate-100 px-1.5 text-[11px] font-medium tabular-nums text-slate-600">
          {comments.length}
        </span>
      </div>

      <div className="min-h-[200px] flex-1 space-y-4 overflow-y-auto py-2">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-8 text-[13px] text-slate-500">
            <Loader2 className="animate-spin text-slate-400" size={16} />
            Loading comments…
          </div>
        ) : error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-[13px] text-red-700">
            {error}
          </div>
        ) : comments.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center py-10 text-center">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
              <MessageSquare size={18} className="text-slate-400" />
            </div>
            <p className="m-0 text-sm font-medium text-slate-700">No comments yet. Start the conversation!</p>
          </div>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="flex gap-3">
              <UserAvatar
                name={comment.user.name}
                email={comment.user.email}
                size="sm"
              />
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex flex-wrap items-baseline gap-x-2">
                  <span className="text-[13px] font-medium text-slate-900">
                    {comment.user.name || comment.user.email}
                  </span>
                  <span className="text-xs text-slate-500">
                    {displayDate(comment.createdAt)}
                  </span>
                </div>
                <div className="break-words rounded-lg rounded-tl-sm border border-slate-200 bg-slate-50 px-3 py-2 text-sm leading-relaxed text-slate-700">
                  {comment.content}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <form onSubmit={handleSubmit} className="sticky bottom-0 -mx-1 mt-3 bg-white px-1 pt-3">
        <div className="relative">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Add a comment..."
            className={cn(textareaClass, 'max-h-32 resize-none pr-12')}
            rows={3}
          />
          <Button
            aria-label="Send comment"
            className="absolute bottom-2 right-2"
            disabled={!content.trim() || submitting}
            icon={Send}
            loading={submitting}
            size="icon-sm"
            type="submit"
            variant="primary"
          />
        </div>
      </form>
    </div>
  );
}

export default CommentSection;
