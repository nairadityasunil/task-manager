import React, { useEffect, useState, useRef, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { getProjectMembers } from '@/services/projects';
import type { ProjectMember } from '@/types/project';
import UserAvatar from './UserAvatar';
import { ChevronDown, User } from 'lucide-react';
import { cn } from '@/components/ui';

interface AssigneeSelectorProps {
  projectId: string | null;
  selectedUserId: string;
  onSelect: (userId: string) => void;
  label?: string;
  className?: string;
  disabled?: boolean;
}

export default function AssigneeSelector({
  projectId,
  selectedUserId,
  onSelect,
  label,
  className = '',
  disabled = false
}: AssigneeSelectorProps) {
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });

  useEffect(() => {
    if (projectId) {
      setLoading(true);
      getProjectMembers(projectId)
        .then(setMembers)
        .catch(console.error)
        .finally(() => setLoading(false));
    } else {
      setMembers([]);
    }
  }, [projectId]);

  useLayoutEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setDropdownPos({
        // The dropdown is `position: fixed`, so viewport coordinates are what we need.
        top: rect.bottom,
        left: Math.max(8, Math.min(rect.left, window.innerWidth - Math.max(rect.width, 220) - 8)),
        width: rect.width
      });
    }
  }, [isOpen]);

  const selectedMember = members.find(m => String(m.userId) === String(selectedUserId));

  return (
    <div className={`relative ${className}`}>
      {label && <label className="mb-1.5 block text-sm font-medium text-slate-700">{label}</label>}
      
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled || loading}
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className={cn(
          'flex h-9 w-full min-w-0 items-center gap-2 rounded-lg border bg-white pl-1.5 pr-2 text-left shadow-sm transition-colors',
          isOpen ? 'border-emerald-500 ring-4 ring-emerald-500/15' : 'border-slate-300 hover:border-slate-400',
          disabled || loading ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
        )}
      >
        {selectedMember ? (
          <>
            <UserAvatar 
              name={selectedMember.user.name} 
              email={selectedMember.user.email} 
              size="sm" 
              showTooltip={false} 
            />
            <span className="min-w-0 flex-1 truncate text-sm text-slate-900">
              {selectedMember.user.name || selectedMember.user.email}
            </span>
          </>
        ) : (
          <>
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-dashed border-slate-300 bg-slate-50">
              <User className="h-3.5 w-3.5 text-slate-400" />
            </div>
            <span className="min-w-0 flex-1 truncate text-sm text-slate-500">Unassigned</span>
          </>
        )}
        <ChevronDown aria-hidden className={cn('h-4 w-4 shrink-0 text-slate-400 transition-transform', isOpen && 'rotate-180')} />
      </button>

      {isOpen && createPortal(
        <>
          <div 
            className="fixed inset-0 z-[6000]" 
            onClick={() => setIsOpen(false)}
          ></div>
          <div 
            className="fixed z-[6001] max-h-60 min-w-[220px] overflow-y-auto rounded-lg border border-slate-200 bg-white p-1 shadow-lg animate-modalIn"
            role="listbox"
            style={{
              top: `${dropdownPos.top + 4}px`,
              left: `${dropdownPos.left}px`,
              width: `${dropdownPos.width}px`
            }}
          >
            {members.length === 0 ? (
              <div className="px-3 py-4 text-center text-[13px] text-slate-500">No members found</div>
            ) : (
              members.map((member) => (
                <button
                  key={member.userId}
                  type="button"
                  onClick={() => {
                    onSelect(member.userId);
                    setIsOpen(false);
                  }}
                  aria-selected={String(selectedUserId) === String(member.userId)}
                  role="option"
                  className={cn(
                    'flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-slate-700 transition-colors',
                    String(selectedUserId) === String(member.userId) ? 'bg-slate-100 text-slate-900' : 'hover:bg-slate-50'
                  )}
                >
                  <UserAvatar 
                    name={member.user.name} 
                    email={member.user.email} 
                    size="sm" 
                    showTooltip={false} 
                  />
                  <div className="flex min-w-0 flex-col items-start">
                    <span className="max-w-full truncate text-sm font-medium">
                      {member.user.name || member.user.email}
                    </span>
                    {member.user.name && (
                      <span className="max-w-full truncate text-xs text-slate-500">
                        {member.user.email}
                      </span>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </>,
        document.body
      )}
    </div>
  );
}