import { useState, useEffect, FormEvent } from 'react';
import { Loader2, Send, MessageSquare, Pencil, Trash2 } from 'lucide-react';
import { Button, cn, textareaClass } from '@/components/ui';
import { useConfirm } from '@/context/ConfirmationContext';
import { useToast } from '@/context/ToastContext';
import { getComments, addComment, updateComment, deleteComment, type Comment } from '@/services/comments';
import { toDisplayErrorMessage } from '@/utils/apiError';
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
  const confirm = useConfirm();
  const { showToast } = useToast();
  const [editing, setEditing] = useState<{ id: string; text: string } | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

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

  const saveEdit = async (comment: Comment): Promise<void> => {
    if (!editing || !editing.text.trim()) return;
    setSavingId(comment.id);
    try {
      const updated = await updateComment(taskId, comment.id, editing.text.trim());
      setComments((prev) => prev.map((c) => (c.id === comment.id ? updated : c)));
      setEditing(null);
    } catch (err) {
      showToast({ variant: 'error', message: toDisplayErrorMessage(err) });
    } finally {
      setSavingId(null);
    }
  };

  const remove = async (comment: Comment): Promise<void> => {
    const sure = await confirm({ title: 'Delete this comment?', message: 'It will be removed for everyone on the task.', confirmText: 'Delete comment', type: 'danger' });
    if (!sure) return;
    setSavingId(comment.id);
    try {
      await deleteComment(taskId, comment.id);
      setComments((prev) => prev.filter((c) => c.id !== comment.id));
      if (editing?.id === comment.id) setEditing(null);
    } catch (err) {
      showToast({ variant: 'error', message: toDisplayErrorMessage(err) });
    } finally {
      setSavingId(null);
    }
  };

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
            <div key={comment.id} className="flex gap-3" data-testid="comment">
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
                    {comment.editedAt ? <span title={`Edited ${displayDate(comment.editedAt)}`}> · edited</span> : null}
                  </span>
                  {comment.canModify && editing?.id !== comment.id ? (
                    <span className="ml-auto flex items-center gap-0.5">
                      <button
                        aria-label="Edit comment"
                        className="grid h-6 w-6 place-items-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                        data-testid="comment-edit"
                        disabled={savingId === comment.id}
                        onClick={() => setEditing({ id: comment.id, text: comment.content })}
                        type="button"
                      >
                        <Pencil size={12} />
                      </button>
                      <button
                        aria-label="Delete comment"
                        className="grid h-6 w-6 place-items-center rounded-md text-slate-400 hover:bg-red-50 hover:text-red-600"
                        data-testid="comment-delete"
                        disabled={savingId === comment.id}
                        onClick={() => void remove(comment)}
                        type="button"
                      >
                        <Trash2 size={12} />
                      </button>
                    </span>
                  ) : null}
                </div>
                {editing?.id === comment.id ? (
                  <div className="grid gap-2">
                    <textarea
                      aria-label="Edit comment text"
                      autoFocus
                      className={cn(textareaClass, 'max-h-48 resize-y')}
                      data-testid="comment-edit-text"
                      onChange={(e) => setEditing({ id: comment.id, text: e.target.value })}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') setEditing(null);
                        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) void saveEdit(comment);
                      }}
                      rows={3}
                      value={editing.text}
                    />
                    <div className="flex justify-end gap-2">
                      <Button onClick={() => setEditing(null)} size="sm" variant="secondary">
                        Cancel
                      </Button>
                      <Button data-testid="comment-edit-save" disabled={!editing.text.trim() || savingId === comment.id} loading={savingId === comment.id} onClick={() => void saveEdit(comment)} size="sm" variant="primary">
                        Save
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="whitespace-pre-wrap break-words rounded-lg rounded-tl-sm border border-slate-200 bg-slate-50 px-3 py-2 text-sm leading-relaxed text-slate-700 [overflow-wrap:anywhere]">
                    {comment.content}
                  </div>
                )}
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
