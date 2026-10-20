import { useState, useEffect, useCallback } from 'react';
import {
  History,
  Plus,
  Pencil,
  Trash2,
  UserPlus,
  UserMinus,
  ArrowRightLeft,
  Loader2,
  Filter,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  ShieldAlert,
  Scale,
} from 'lucide-react';
import { getProjectActivities, verifyProjectAuditChain, getRetentionPolicy, updateRetentionPolicy, type ActivityLog, type RetentionPolicy } from '@/services/activity';
import Modal from '@/components/Modal';
import { useToast } from '@/context/ToastContext';
import { Badge, Button, Field, inputClass, selectClass } from '@/components/ui';

interface ActivityHistoryPanelProps {
  projectId: string;
  projectName: string;
}

const ENTITY_LABELS: Record<string, string> = {
  project: 'Project',
  epic: 'Epic',
  task: 'Task',
  subtask: 'Subtask',
  note: 'Note'
};

const ENTITY_COLORS: Record<string, string> = {
  project: 'bg-slate-500',
  epic: 'bg-sky-500',
  task: 'bg-emerald-500',
  subtask: 'bg-teal-500',
  note: 'bg-amber-500'
};

const ACTION_ICONS: Record<string, typeof Plus> = {
  created: Plus,
  updated: Pencil,
  deleted: Trash2,
  assigned: UserPlus,
  status_changed: ArrowRightLeft,
  member_added: UserPlus,
  member_removed: UserMinus,
  approved: ShieldCheck,
  rejected: ShieldAlert,
  escalated: ShieldAlert,
};

const ACTION_COLORS: Record<string, string> = {
  created: 'text-emerald-600 bg-emerald-50',
  updated: 'text-slate-600 bg-slate-100',
  deleted: 'text-red-600 bg-red-50',
  assigned: 'text-sky-600 bg-sky-50',
  status_changed: 'text-amber-600 bg-amber-50',
  member_added: 'text-emerald-600 bg-emerald-50',
  member_removed: 'text-red-600 bg-red-50',
  approved: 'text-emerald-600 bg-emerald-50',
  rejected: 'text-red-600 bg-red-50',
  escalated: 'text-red-600 bg-red-50'
};

const FILTER_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'project', label: 'Project' },
  { value: 'epic', label: 'Epics' },
  { value: 'task', label: 'Tasks' },
  { value: 'subtask', label: 'Subtasks' },
  { value: 'note', label: 'Notes' },
];

function getDateLabel(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const msgDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (msgDate.getTime() === today.getTime()) return 'Today';
  if (msgDate.getTime() === yesterday.getTime()) return 'Yesterday';
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

function formatTime(dateString: string): string {
  return new Date(dateString).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function ActivityHistoryPanel({
  projectId,
  projectName,
}: ActivityHistoryPanelProps) {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [entityFilter, setEntityFilter] = useState('');
  
  const { showToast } = useToast();
  const [verifying, setVerifying] = useState(false);
  
  // Retention Modal State
  const [retentionModalOpen, setRetentionModalOpen] = useState(false);
  const [, setRetentionPolicy] = useState<RetentionPolicy | null>(null);
  const [retentionDaysInput, setRetentionDaysInput] = useState<string>('');
  const [legalHoldInput, setLegalHoldInput] = useState(false);
  const [savingRetention, setSavingRetention] = useState(false);

  const handleVerifyChain = async () => {
    setVerifying(true);
    try {
      const result = await verifyProjectAuditChain(projectId);
      if (result.valid) {
        showToast({ message: `Audit chain verified successfully. Checked ${result.checked} records.`, variant: 'success' });
      } else {
        showToast({ message: `Audit chain verification failed at sequence ${result.failedSequence}. Data may be tampered.`, variant: 'error' });
      }
    } catch {
      showToast({ message: 'Failed to verify audit chain', variant: 'error' });
    }
    setVerifying(false);
  };

  const openRetentionModal = async () => {
    setRetentionModalOpen(true);
    try {
      const policy = await getRetentionPolicy(projectId);
      setRetentionPolicy(policy);
      setRetentionDaysInput(policy.retentionDays !== null ? policy.retentionDays.toString() : '');
      setLegalHoldInput(policy.legalHold);
    } catch {
      showToast({ message: 'Failed to fetch retention policy', variant: 'error' });
    }
  };

  const saveRetentionPolicy = async () => {
    setSavingRetention(true);
    try {
      const days = retentionDaysInput.trim() === '' ? null : parseInt(retentionDaysInput, 10);
      const updated = await updateRetentionPolicy(projectId, { retentionDays: days, legalHold: legalHoldInput });
      setRetentionPolicy(updated);
      showToast({ message: 'Retention policy updated successfully', variant: 'success' });
      setRetentionModalOpen(false);
    } catch {
      showToast({ message: 'Failed to update retention policy', variant: 'error' });
    }
    setSavingRetention(false);
  };

  const fetchActivities = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getProjectActivities(projectId, {
        page,
        limit: 30,
        entityType: entityFilter || undefined,
      });
      setActivities(result.activities);
      setTotalPages(result.totalPages);
    } catch (err) {
      console.error('Failed to load activities', err);
    }
    setLoading(false);
  }, [projectId, page, entityFilter]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  // Group activities by date
  const groupedActivities: { label: string; items: ActivityLog[] }[] = [];
  let currentLabel = '';
  for (const activity of activities) {
    const label = getDateLabel(activity.createdAt);
    if (label !== currentLabel) {
      groupedActivities.push({ label, items: [] });
      currentLabel = label;
    }
    groupedActivities[groupedActivities.length - 1].items.push(activity);
  }

  return (
    <div className="flex h-full max-h-[75vh] flex-col">
      <h3 className="sr-only">Activity History for {projectName}</h3>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 px-4 py-3 sm:px-5">
        <div className="relative flex items-center">
          <Filter className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-slate-400" />
          <select
            aria-label="Filter activity"
            value={entityFilter}
            onChange={(e) => {
              setEntityFilter(e.target.value);
              setPage(1);
            }}
            className={`${selectClass} h-8 !w-auto pl-8 text-[13px]`}
          >
            {FILTER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Button icon={ShieldCheck} loading={verifying} onClick={handleVerifyChain} size="sm" variant="secondary">
            Verify Chain
          </Button>
          <Button icon={Scale} onClick={openRetentionModal} size="sm" variant="secondary">
            Retention Policy
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="custom-scrollbar flex-1 overflow-y-auto px-2 py-3 sm:px-3">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
            Loading activity…
          </div>
        ) : activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-500">
              <History size={18} />
            </div>
            <p className="m-0 mt-3 text-[15px] font-semibold text-slate-900">No activity yet</p>
            <p className="m-0 mt-1 text-sm text-slate-500">Changes to this project will appear here.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {groupedActivities.map((group) => (
              <div key={group.label}>
                <div className="px-2 pb-1.5 pt-1 text-xs font-medium text-slate-500 sm:px-3">{group.label}</div>

                <div className="space-y-0.5">
                  {group.items.map((activity) => {
                    const IconComponent = ACTION_ICONS[activity.action] || Pencil;
                    const colorClass = ACTION_COLORS[activity.action] || ACTION_COLORS.updated;
                    const entityColor = ENTITY_COLORS[activity.entityType] || 'bg-slate-500';

                    return (
                      <div
                        key={activity.id}
                        className="flex items-start gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-slate-50 sm:px-3"
                      >
                        <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${colorClass}`}>
                          <IconComponent className="h-3.5 w-3.5" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 text-sm">
                            <span className="font-medium text-slate-900">{activity.userName}</span>
                            <span className="text-slate-600">{activity.description}</span>
                            <span className="ml-auto whitespace-nowrap text-xs text-slate-400">{formatTime(activity.createdAt)}</span>
                          </div>

                          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                            <Badge>
                              <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${entityColor}`} />
                              {ENTITY_LABELS[activity.entityType]}
                            </Badge>
                            <Badge tone="success">
                              <ShieldCheck size={10} />
                              #{activity.sequence}
                            </Badge>
                            {activity.entityName && (
                              <span className="max-w-[200px] truncate text-xs text-slate-500">{activity.entityName}</span>
                            )}
                          </div>

                          {activity.changes.length > 0 && (
                            <div className="mt-2 space-y-1">
                              {activity.changes.slice(0, 3).map((change, idx) => (
                                <div
                                  key={idx}
                                  className="flex min-w-0 items-center gap-2 rounded-md border border-slate-100 bg-slate-50 px-2.5 py-1 text-xs text-slate-500"
                                >
                                  <span className="shrink-0 font-medium capitalize text-slate-600">{change.field}:</span>
                                  {change.oldValue && (
                                    <span className="max-w-[120px] truncate text-red-500 line-through">{change.oldValue}</span>
                                  )}
                                  {change.oldValue && change.newValue && <span className="text-slate-300">→</span>}
                                  {change.newValue && (
                                    <span className="max-w-[120px] truncate text-emerald-700">{change.newValue}</span>
                                  )}
                                </div>
                              ))}
                              {activity.changes.length > 3 && (
                                <span className="pl-2.5 text-xs text-slate-400">+{activity.changes.length - 3} more changes</span>
                              )}
                            </div>
                          )}
                          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                            <span className="font-mono">hash {(activity.immutableHash || 'pending-migration').slice(0, 16)}</span>
                            {activity.legalHold && <span className="font-medium text-red-600">legal hold</span>}
                            {activity.retentionUntil && <span>retains until {new Date(activity.retentionUntil).toLocaleDateString()}</span>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-3 border-t border-slate-200 bg-slate-50/60 px-4 py-2.5 sm:px-5">
          <Button disabled={page <= 1} icon={ChevronLeft} onClick={() => setPage((p) => Math.max(1, p - 1))} size="sm" variant="ghost">
            Previous
          </Button>
          <span className="text-xs text-slate-500">
            Page {page} of {totalPages}
          </span>
          <Button disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} size="sm" variant="ghost">
            Next
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {retentionModalOpen && (
        <Modal
          footer={
            <>
              <Button onClick={() => setRetentionModalOpen(false)} variant="secondary">
                Cancel
              </Button>
              <Button icon={ShieldCheck} loading={savingRetention} onClick={saveRetentionPolicy} variant="primary">
                {savingRetention ? 'Saving...' : 'Save Policy'}
              </Button>
            </>
          }
          onClose={() => setRetentionModalOpen(false)}
          title="Legal Retention Policy"
        >
          <p className="m-0 text-sm text-slate-500">
            Configure how long activity logs are retained for compliance. Enabling legal hold prevents deletion regardless of retention days.
          </p>

          <Field label="Retention days">
            <input
              type="number"
              min="0"
              value={retentionDaysInput}
              onChange={(e) => setRetentionDaysInput(e.target.value)}
              placeholder="e.g. 2555 for 7 years (leave empty for infinite)"
              className={inputClass}
            />
          </Field>

          <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3" htmlFor="legalHold">
            <input
              type="checkbox"
              id="legalHold"
              checked={legalHoldInput}
              onChange={(e) => setLegalHoldInput(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 accent-emerald-600"
            />
            <span className="text-sm font-medium text-red-600">Enable Legal Hold</span>
          </label>
        </Modal>
      )}
    </div>
  );
}

export default ActivityHistoryPanel;
