import { useState } from 'react';
import { Check, X } from 'lucide-react';
import { Subtask } from '@/types/task';
import type { ProjectMember } from '@/types/project';
import UserAvatar from './UserAvatar';
import { Button, cn, inputClass, selectClass, textareaClass } from '@/components/ui';

interface SubtaskInlineEditProps {
  subtask: Subtask;
  onSave: (patch: { title: string; description?: string; note?: string; assignedToUserId?: string | null }) => void;
  onCancel: () => void;
  isSaving?: boolean;
  members: ProjectMember[];
}

const labelCls = 'text-[13px] font-medium text-slate-700';

export default function SubtaskInlineEdit({ subtask, onSave, onCancel, isSaving, members }: SubtaskInlineEditProps) {
  const [title, setTitle] = useState(subtask.title);
  const [description, setDescription] = useState(subtask.description ?? '');
  const [note, setNote] = useState(subtask.note ?? '');
  const [assignedToUserId, setAssignedToUserId] = useState<string | null>(subtask.assignedToUserId);

  const handleSave = () => {
    if (!title.trim()) return;
    onSave({ 
      title: title.trim(), 
      description: description.trim() || undefined,
      note: note.trim() || undefined,
      assignedToUserId
    });
  };

  return (
    <div className="mt-3 grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
      <label className="grid gap-1.5">
        <span className={labelCls}>Subtask Title</span>
        <input
          autoFocus
          className={inputClass}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          placeholder="What needs to be done?"
          type="text"
          value={title}
        />
      </label>

      <label className="grid gap-1.5">
        <span className={labelCls}>Description (optional)</span>
        <textarea
          className={cn(textareaClass, 'min-h-[60px] resize-none')}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Add some details..."
          rows={2}
          value={description}
        />
      </label>

      <label className="grid gap-1.5">
        <span className={labelCls}>Internal Note (optional)</span>
        <textarea
          className={cn(textareaClass, 'min-h-[60px] resize-none')}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Private notes..."
          rows={2}
          value={note}
        />
      </label>

      <label className="grid gap-1.5">
        <span className={labelCls}>Assignee</span>
        <div className="flex items-center gap-3">
          <select
            className={selectClass}
            onChange={(e) => setAssignedToUserId(e.target.value || null)}
            value={assignedToUserId || ''}
          >
            <option value="">Unassigned</option>
            {members.map((member) => (
              <option key={member.id} value={member.userId}>
                {member.user.name || member.user.email}
              </option>
            ))}
          </select>
          {assignedToUserId && (
            <UserAvatar 
              name={members.find(m => m.userId === assignedToUserId)?.user.name || null}
              email={members.find(m => m.userId === assignedToUserId)?.user.email || ''}
              size="md"
              showTooltip={false}
            />
          )}
        </div>
      </label>

      <div className="flex justify-end gap-2">
        <Button aria-label="Cancel" icon={X} onClick={onCancel} size="icon-sm" title="Cancel" variant="ghost" />
        <Button
          disabled={isSaving || !title.trim()}
          icon={Check}
          onClick={handleSave}
          size="sm"
          variant="primary"
        >
          {isSaving ? 'Saving...' : 'Save'}
        </Button>
      </div>
    </div>
  );
}