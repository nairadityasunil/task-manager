import { useState, useEffect, useCallback } from 'react';
import { ShieldCheck, ShieldAlert, CheckCircle2, XCircle, Plus, Loader2, Clock3 } from 'lucide-react';
import { listApprovals, createApproval, decideApproval, type ApprovalWorkflow, type ApprovalAction } from '@/services/approvals';
import type { ProjectMember } from '@/types/project';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import Modal from '@/components/Modal';
import { Badge, Button, cn, Field, selectClass, textareaClass, type BadgeTone } from '@/components/ui';

const STATUS_TONE: Record<string, BadgeTone> = {
  APPROVED: 'success',
  REJECTED: 'danger',
  PENDING: 'warning',
  CANCELLED: 'neutral',
};

interface ApprovalSectionProps {
  projectId: string;
  taskId: string;
  members: ProjectMember[];
}

const ACTION_LABELS: Record<ApprovalAction, string> = {
  PRIORITY_CHANGE: 'Priority Change',
  DYNAMIC_PRIORITY_ESCALATION: 'Dynamic Priority Escalation',
  RETENTION_POLICY_CHANGE: 'Retention Policy Change',
  LEGAL_HOLD_CHANGE: 'Legal Hold Change',
};

export default function ApprovalSection({ projectId, taskId, members }: ApprovalSectionProps) {
  const [approvals, setApprovals] = useState<ApprovalWorkflow[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { showToast } = useToast();

  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [action, setAction] = useState<ApprovalAction>('DYNAMIC_PRIORITY_ESCALATION');
  const [reason, setReason] = useState('');
  const [selectedApprovers, setSelectedApprovers] = useState<string[]>([]);
  const [submittingRequest, setSubmittingRequest] = useState(false);

  const fetchApprovals = useCallback(async () => {
    setLoading(true);
    try {
      const allApprovals = await listApprovals(projectId);
      const taskApprovals = allApprovals.filter(a => a.taskId === taskId);
      setApprovals(taskApprovals);
    } catch {
      showToast({ message: 'Failed to load approvals', variant: 'error' });
    }
    setLoading(false);
  }, [projectId, taskId, showToast]);

  useEffect(() => {
    void fetchApprovals();
  }, [fetchApprovals]);

  const handleRequestApproval = async () => {
    if (selectedApprovers.length === 0) {
      showToast({ message: 'Please select at least one approver', variant: 'error' });
      return;
    }
    setSubmittingRequest(true);
    try {
      await createApproval({
        projectId,
        taskId,
        action,
        reason,
        approverUserIds: selectedApprovers,
        payload: { priority: 'CRITICAL' }, // Defaulting to CRITICAL for escalation
      });
      showToast({ message: 'Approval requested successfully', variant: 'success' });
      setRequestModalOpen(false);
      setReason('');
      setSelectedApprovers([]);
      void fetchApprovals();
    } catch {
      showToast({ message: 'Failed to request approval', variant: 'error' });
    }
    setSubmittingRequest(false);
  };

  const handleDecision = async (approvalId: string, decision: 'APPROVED' | 'REJECTED') => {
    try {
      await decideApproval(approvalId, { decision });
      showToast({ message: `Successfully ${decision.toLowerCase()} approval`, variant: 'success' });
      void fetchApprovals();
    } catch {
      showToast({ message: `Failed to ${decision.toLowerCase()} approval`, variant: 'error' });
    }
  };

  const toggleApprover = (userId: string) => {
    setSelectedApprovers(prev => 
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  return (
    <section className="border-t border-slate-200 pt-6">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="m-0 flex items-center gap-2 text-[15px] font-semibold text-slate-900">
          <ShieldCheck className="h-4 w-4 text-slate-400" />
          Approval Workflows
        </h3>
        <Button icon={Plus} onClick={() => setRequestModalOpen(true)} size="sm" variant="secondary">
          Request Approval
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-4 text-[13px] text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
          Loading approvals…
        </div>
      ) : approvals.length === 0 ? (
        <p className="m-0 rounded-lg border border-dashed border-slate-200 px-4 py-4 text-center text-[13px] text-slate-500">No approval workflows for this task.</p>
      ) : (
        <div className="grid gap-3">
          {approvals.map((approval) => {
            const isPendingForMe = approval.status === 'PENDING' &&
              approval.signOffChain.some(s => s.approverUserId === user?.id && s.status === 'PENDING');

            return (
              <div key={approval.id} className="rounded-lg border border-slate-200 bg-white p-3 text-sm">
                <div className="mb-1.5 flex items-start justify-between gap-3">
                  <span className="font-medium text-slate-900">{ACTION_LABELS[approval.action] || approval.action}</span>
                  <Badge dot tone={STATUS_TONE[approval.status] ?? 'neutral'}>
                    {approval.status.charAt(0) + approval.status.slice(1).toLowerCase()}
                  </Badge>
                </div>
                {approval.reason ? <p className="m-0 mb-3 text-[13px] text-slate-600">{approval.reason}</p> : null}

                <ol className="m-0 mb-1 list-none space-y-1.5 p-0">
                  {approval.signOffChain.map((step) => {
                    const memberName = members.find(m => m.userId === step.approverUserId)?.user.name || 'Unknown User';
                    return (
                      <li key={step.order} className="flex items-center gap-2 text-[13px] text-slate-600">
                        {step.status === 'APPROVED' ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> :
                         step.status === 'REJECTED' ? <XCircle className="h-4 w-4 text-red-500" /> :
                         <Clock3 className="h-4 w-4 text-amber-500" />}
                        <span>{memberName}</span>
                      </li>
                    );
                  })}
                </ol>

                {isPendingForMe && (
                  <div className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-3">
                    <Button className="flex-1" onClick={() => handleDecision(approval.id, 'APPROVED')} size="sm" variant="accent">
                      Approve
                    </Button>
                    <Button className="flex-1" onClick={() => handleDecision(approval.id, 'REJECTED')} size="sm" variant="danger">
                      Reject
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {requestModalOpen && (
        <Modal onClose={() => setRequestModalOpen(false)} title="Request Approval">
          <div className="grid gap-4">
            <Field label="Action Type">
              <select
                value={action}
                onChange={(e) => setAction(e.target.value as ApprovalAction)}
                className={selectClass}
              >
                {Object.entries(ACTION_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </Field>

            <Field label="Reason">
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Why is this approval needed?"
                className={cn(textareaClass, 'min-h-[80px]')}
              />
            </Field>

            <div className="grid gap-1.5">
              <span className="text-sm font-medium text-slate-700">Select Approvers (ordered)</span>
              <div className="max-h-48 overflow-y-auto rounded-lg border border-slate-200 bg-white custom-scrollbar">
                {members.map(member => (
                  <label key={member.userId} className="flex cursor-pointer items-center gap-3 border-b border-slate-100 px-3 py-2.5 last:border-0 hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={selectedApprovers.includes(member.userId)}
                      onChange={() => toggleApprover(member.userId)}
                      className="h-4 w-4 rounded border-slate-300 accent-emerald-600"
                    />
                    <span className="min-w-0 flex-1 truncate text-sm text-slate-800">{member.user.name || member.user.email}</span>
                    {selectedApprovers.includes(member.userId) ? (
                      <span className="text-xs tabular-nums text-slate-500">#{selectedApprovers.indexOf(member.userId) + 1}</span>
                    ) : null}
                  </label>
                ))}
              </div>
            </div>

            <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
              <Button onClick={() => setRequestModalOpen(false)} variant="secondary">
                Cancel
              </Button>
              <Button
                disabled={submittingRequest || selectedApprovers.length === 0}
                icon={ShieldAlert}
                loading={submittingRequest}
                onClick={handleRequestApproval}
                variant="primary"
              >
                {submittingRequest ? 'Submitting...' : 'Request'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </section>
  );
}
