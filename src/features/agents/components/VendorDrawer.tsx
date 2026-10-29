import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Ban, ClipboardCheck, Download, FileCheck2, Gauge, History, Plug, ShieldCheck, ShieldMinus, Trash2, Upload, X } from 'lucide-react';

import { Badge, Button, Field, Tabs, cn, inputClass, selectClass, textareaClass, type BadgeTone } from '@/components/ui';
import { useConfirm } from '@/context/ConfirmationContext';
import { useToast } from '@/context/ToastContext';
import { workspaceService } from '@/features/workspaces/services/workspaceService';
import type { WorkspaceMember } from '@/features/workspaces/types/workspace';
import { timeAgo, userLabel } from '@/services/agents';
import {
  EVIDENCE_ACCEPT,
  EVIDENCE_KIND_LABELS,
  SOURCE_LABELS,
  TIER_LABELS,
  VENDOR_CATEGORY_LABELS,
  VENDOR_STATUS_EFFECTS,
  VENDOR_STATUS_LABELS,
  formatBytes,
  saveBlob,
  vendorsApi,
  type EvidenceKind,
  type VendorCategory,
  type VendorDetail,
  type VendorStatus,
  type VendorTier
} from '@/services/vendors';
import { toDisplayErrorMessage } from '@/utils/apiError';
import { KindLabel, RiskBadge, StatusBadge } from './shared';

type DrawerTab = 'overview' | 'assessment' | 'evidence' | 'usage' | 'history';

const STATUS_TONES: Record<VendorStatus, BadgeTone> = {
  under_review: 'info',
  approved: 'success',
  restricted: 'warning',
  blocked: 'danger'
};

export function VendorStatusBadge({ status }: { status: VendorStatus }): JSX.Element {
  return (
    <Badge dot tone={STATUS_TONES[status]}>
      {VENDOR_STATUS_LABELS[status]}
    </Badge>
  );
}

const dateInput = (iso?: string | null) => (iso ? iso.slice(0, 10) : '');
const shortDate = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString() : '—');
const isPast = (iso?: string | null) => Boolean(iso && new Date(iso).getTime() < Date.now());

const HISTORY_LABELS: Record<string, string> = {
  discovered: 'Found',
  status: 'Status changed',
  assessment: 'Assessment saved',
  assessed: 'Assessment completed',
  evidence: 'Evidence',
  updated: 'Details changed'
};

interface VendorDrawerProps {
  vendorId: string;
  workspaceId: string | null;
  onClose: () => void;
  onChanged: () => void;
}

export function VendorDrawer({ vendorId, workspaceId, onClose, onChanged }: VendorDrawerProps): JSX.Element | null {
  const { showToast } = useToast();
  const confirm = useConfirm();
  const [tab, setTab] = useState<DrawerTab>('overview');
  const [vendor, setVendor] = useState<VendorDetail | null>(null);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [busy, setBusy] = useState(false);
  // Overview form
  const [form, setForm] = useState({
    purpose: '',
    website: '',
    dataLocation: '',
    notes: '',
    category: 'other' as VendorCategory,
    tier: 2 as VendorTier,
    ownerUserId: '',
    dpaExpiresAt: '',
    contractRenewalAt: '',
    includeInSubprocessors: false
  });
  const [reasonFor, setReasonFor] = useState<VendorStatus | null>(null);
  const [reason, setReason] = useState('');
  // Assessment
  const [answers, setAnswers] = useState<Record<string, string>>({});
  // Evidence
  const fileInput = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [evidenceKind, setEvidenceKind] = useState<EvidenceKind>('soc2');
  const [evidenceExpiry, setEvidenceExpiry] = useState('');

  const load = useCallback(async () => {
    try {
      const detail = await vendorsApi.get(vendorId, workspaceId);
      setVendor(detail);
      setForm({
        purpose: detail.purpose ?? '',
        website: detail.website ?? '',
        dataLocation: detail.dataLocation ?? '',
        notes: detail.notes ?? '',
        category: detail.category,
        tier: detail.tier,
        ownerUserId: detail.ownerUserId ? (typeof detail.ownerUserId === 'object' ? detail.ownerUserId._id : detail.ownerUserId) : '',
        dpaExpiresAt: dateInput(detail.dpaExpiresAt),
        contractRenewalAt: dateInput(detail.contractRenewalAt),
        includeInSubprocessors: detail.includeInSubprocessors
      });
      setAnswers(detail.answers ?? {});
    } catch (error) {
      showToast({ variant: 'error', message: toDisplayErrorMessage(error) });
      onClose();
    }
  }, [vendorId, workspaceId, onClose, showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!workspaceId) return;
    workspaceService
      .listMembers(workspaceId)
      .then(setMembers)
      .catch(() => setMembers([]));
  }, [workspaceId]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const act = async (fn: () => Promise<unknown>, message: string) => {
    setBusy(true);
    try {
      await fn();
      showToast({ variant: 'success', message });
      await load();
      onChanged();
      return true;
    } catch (error) {
      showToast({ variant: 'error', message: toDisplayErrorMessage(error) });
      return false;
    } finally {
      setBusy(false);
    }
  };

  const changeStatus = async (status: VendorStatus, note?: string) => {
    const ok = await act(
      () => vendorsApi.setStatus(vendorId, status, note, workspaceId),
      `${vendor?.name} ${VENDOR_STATUS_LABELS[status].toLowerCase()}`
    );
    if (ok) {
      setReasonFor(null);
      setReason('');
    }
  };

  const saveDetails = () =>
    act(
      () =>
        vendorsApi.update(
          vendorId,
          {
            purpose: form.purpose.trim() || null,
            website: form.website.trim() || null,
            dataLocation: form.dataLocation.trim() || null,
            notes: form.notes.trim() || null,
            category: form.category,
            tier: form.tier,
            ownerUserId: form.ownerUserId || null,
            dpaExpiresAt: form.dpaExpiresAt || null,
            contractRenewalAt: form.contractRenewalAt || null,
            includeInSubprocessors: form.includeInSubprocessors
          },
          workspaceId
        ),
      'Vendor saved'
    );

  const upload = async () => {
    if (!file) return;
    const ok = await act(() => vendorsApi.uploadEvidence(vendorId, file, evidenceKind, evidenceExpiry || null, workspaceId), `${file.name} uploaded`);
    if (ok) {
      setFile(null);
      setEvidenceExpiry('');
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  if (typeof document === 'undefined') return null;

  const questions = vendor?.questionnaire.questions ?? [];
  const sections = [...new Set(questions.map((q) => q.section))];
  const missing = questions.filter((q) => q.required && !answers[q.id]).length;

  return createPortal(
    <div className="fixed inset-0 z-[900] flex justify-end" role="dialog" aria-modal="true" aria-label="Vendor details">
      <button aria-label="Close" className="absolute inset-0 bg-slate-950/30 backdrop-blur-[1px]" onClick={onClose} type="button" />
      <aside className="relative flex h-full w-full max-w-[600px] flex-col border-l border-slate-200 bg-white shadow-2xl animate-in slide-in-from-right duration-200">
        {!vendor ? (
          <div className="space-y-3 p-5">
            <div className="h-6 w-48 animate-pulse rounded bg-slate-100" />
            <div className="h-24 animate-pulse rounded-xl bg-slate-100" />
          </div>
        ) : (
          <>
            <div className="border-b border-slate-200 px-5 pt-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="m-0 truncate text-lg font-semibold tracking-tight text-slate-900">{vendor.name}</h2>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <span className="text-[13px] text-slate-600">{VENDOR_CATEGORY_LABELS[vendor.category]}</span>
                    <VendorStatusBadge status={vendor.status} />
                    <RiskBadge level={vendor.riskLevel} score={vendor.residualRisk} />
                    <Badge tone="neutral">Tier {vendor.tier}</Badge>
                  </div>
                </div>
                <Button aria-label="Close" icon={X} onClick={onClose} size="icon-sm" variant="ghost" />
              </div>
              <Tabs
                className="mt-3"
                items={[
                  { value: 'overview', label: 'Overview', icon: Gauge },
                  {
                    value: 'assessment',
                    label: 'Assessment',
                    icon: ClipboardCheck,
                    count: vendor.questionnaire.missing.length || undefined
                  },
                  {
                    value: 'evidence',
                    label: 'Evidence',
                    icon: FileCheck2,
                    count: vendor.evidence.length || undefined
                  },
                  {
                    value: 'usage',
                    label: 'Usage',
                    icon: Plug,
                    count: vendor.agents.length + vendor.webhooks.length || undefined
                  },
                  { value: 'history', label: 'History', icon: History }
                ]}
                onChange={setTab}
                value={tab}
              />
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto p-5">
              {tab === 'overview' ? (
                <>
                  <div className="space-y-2 rounded-xl border border-slate-200 p-3" data-testid="vendor-status">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-[13px] font-medium text-slate-700">Decision</span>
                      <div className="flex flex-wrap gap-1.5">
                        {vendor.status !== 'approved' ? (
                          <Button icon={ShieldCheck} loading={busy} onClick={() => void changeStatus('approved')} size="sm" variant="primary">
                            Approve
                          </Button>
                        ) : null}
                        {vendor.status !== 'restricted' ? (
                          <Button icon={ShieldMinus} onClick={() => setReasonFor('restricted')} size="sm">
                            Restrict
                          </Button>
                        ) : null}
                        {vendor.status !== 'blocked' ? (
                          <Button icon={Ban} onClick={() => setReasonFor('blocked')} size="sm" variant="danger">
                            Block
                          </Button>
                        ) : null}
                        {vendor.status !== 'under_review' ? (
                          <Button loading={busy} onClick={() => void changeStatus('under_review')} size="sm" variant="ghost">
                            Back to review
                          </Button>
                        ) : null}
                      </div>
                    </div>
                    <p className="m-0 text-xs text-slate-500">{VENDOR_STATUS_EFFECTS[vendor.status]}</p>
                    {vendor.statusReason ? (
                      <p className="m-0 rounded-lg bg-amber-50 p-2 text-[13px] text-amber-800">Reason: {vendor.statusReason}</p>
                    ) : null}
                    {reasonFor ? (
                      <div className="grid gap-2 rounded-lg bg-slate-50 p-2.5">
                        <Field label={`Why ${reasonFor === 'blocked' ? 'block' : 'restrict'} ${vendor.name}?`}>
                          <input
                            autoFocus
                            className={inputClass}
                            maxLength={500}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="e.g. Trains on customer data; no DPA"
                            value={reason}
                          />
                        </Field>
                        <div className="flex gap-1.5">
                          <Button
                            disabled={!reason.trim()}
                            loading={busy}
                            onClick={() => void changeStatus(reasonFor, reason.trim())}
                            size="sm"
                            variant={reasonFor === 'blocked' ? 'danger' : 'primary'}
                          >
                            {reasonFor === 'blocked' ? 'Block vendor' : 'Restrict vendor'}
                          </Button>
                          <Button onClick={() => setReasonFor(null)} size="sm" variant="ghost">
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : null}
                  </div>

                  <dl className="m-0 grid grid-cols-2 gap-3 text-[13px] sm:grid-cols-3">
                    {[
                      ['Inherent risk', `${vendor.inherentRisk}/100`],
                      ['Residual risk', `${vendor.residualRisk}/100`],
                      ['AI spend, 30 days', `$${vendor.spend30d.toFixed(2)}`],
                      ['Assessed', vendor.assessmentCompletedAt ? shortDate(vendor.assessmentCompletedAt) : 'Not yet'],
                      ['Next review', vendor.nextReviewAt ? shortDate(vendor.nextReviewAt) : '—'],
                      ['Found', `${timeAgo(vendor.firstSeenAt)} · ${vendor.sources.map((s) => SOURCE_LABELS[s] ?? s).join(', ')}`]
                    ].map(([label, value]) => (
                      <div className="min-w-0 rounded-lg border border-slate-200 p-2.5" key={label}>
                        <dt className="text-xs text-slate-500">{label}</dt>
                        <dd
                          className={cn(
                            'm-0 mt-0.5 truncate font-medium text-slate-900',
                            label === 'Next review' && vendor.reviewDue && 'text-red-600'
                          )}
                          title={value}
                        >
                          {value}
                        </dd>
                      </div>
                    ))}
                  </dl>

                  {vendor.riskFactors.length ? (
                    <div className="rounded-xl border border-slate-200 p-3">
                      <div className="mb-2 text-[13px] font-medium text-slate-700">Why this score</div>
                      <ul className="m-0 list-none space-y-1.5 p-0" data-testid="vendor-risk-factors">
                        {vendor.riskFactors.map((factor) => (
                          <li className="flex items-start justify-between gap-2 text-[13px]" key={factor.code}>
                            <span className="min-w-0 text-slate-700">
                              {factor.label}
                              <span className="block text-xs text-slate-400">{factor.framework}</span>
                            </span>
                            <span
                              className={cn('shrink-0 text-xs font-semibold tabular-nums', factor.weight > 0 ? 'text-amber-600' : 'text-emerald-600')}
                            >
                              {factor.weight > 0 ? `+${factor.weight}` : factor.weight}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field className="sm:col-span-2" label="What it does for you">
                      <input
                        className={inputClass}
                        maxLength={300}
                        onChange={(e) => setForm({ ...form, purpose: e.target.value })}
                        value={form.purpose}
                      />
                    </Field>
                    <Field label="Owner">
                      <select className={selectClass} onChange={(e) => setForm({ ...form, ownerUserId: e.target.value })} value={form.ownerUserId}>
                        <option value="">No owner</option>
                        {members.map((m) => (
                          <option key={m.userId} value={m.userId}>
                            {m.name || m.email}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field hint={`Reassessed every ${form.tier === 1 ? 12 : form.tier === 2 ? 24 : 36} months`} label="Criticality">
                      <select
                        className={selectClass}
                        onChange={(e) => setForm({ ...form, tier: Number(e.target.value) as VendorTier })}
                        value={form.tier}
                      >
                        {([1, 2, 3] as VendorTier[]).map((t) => (
                          <option key={t} value={t}>
                            {TIER_LABELS[t]}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Category">
                      <select
                        className={selectClass}
                        onChange={(e) => setForm({ ...form, category: e.target.value as VendorCategory })}
                        value={form.category}
                      >
                        {(Object.keys(VENDOR_CATEGORY_LABELS) as VendorCategory[]).map((c) => (
                          <option key={c} value={c}>
                            {VENDOR_CATEGORY_LABELS[c]}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Where it keeps data">
                      <input
                        className={inputClass}
                        maxLength={200}
                        onChange={(e) => setForm({ ...form, dataLocation: e.target.value })}
                        placeholder="e.g. EU (Ireland)"
                        value={form.dataLocation}
                      />
                    </Field>
                    <Field label="Website">
                      <input
                        className={inputClass}
                        maxLength={300}
                        onChange={(e) => setForm({ ...form, website: e.target.value })}
                        placeholder="https://"
                        value={form.website}
                      />
                    </Field>
                    <Field error={isPast(vendor.dpaExpiresAt) ? 'Expired' : undefined} label="DPA expires">
                      <input
                        className={inputClass}
                        onChange={(e) => setForm({ ...form, dpaExpiresAt: e.target.value })}
                        type="date"
                        value={form.dpaExpiresAt}
                      />
                    </Field>
                    <Field label="Contract renews">
                      <input
                        className={inputClass}
                        onChange={(e) => setForm({ ...form, contractRenewalAt: e.target.value })}
                        type="date"
                        value={form.contractRenewalAt}
                      />
                    </Field>
                    <Field className="sm:col-span-2" label="Notes">
                      <textarea
                        className={textareaClass}
                        maxLength={4000}
                        onChange={(e) => setForm({ ...form, notes: e.target.value })}
                        rows={3}
                        value={form.notes}
                      />
                    </Field>
                    <label className="flex items-start gap-2 text-[13px] text-slate-700 sm:col-span-2">
                      <input
                        checked={form.includeInSubprocessors}
                        className="mt-0.5"
                        onChange={(e) => setForm({ ...form, includeInSubprocessors: e.target.checked })}
                        type="checkbox"
                      />
                      <span>
                        List as a sub-processor
                        <span className="block text-xs text-slate-500">
                          Approved vendors with this on appear in the sub-processor list you share with customers.
                        </span>
                      </span>
                    </label>
                  </div>
                  <div className="flex flex-wrap justify-between gap-2">
                    <Button loading={busy} onClick={() => void saveDetails()} variant="primary">
                      Save details
                    </Button>
                    <Button
                      icon={Trash2}
                      onClick={async () => {
                        const ok = await confirm({
                          title: `Delete ${vendor.name}?`,
                          message:
                            'Its assessment, evidence files and history are deleted. Vendors still used by an agent or webhook cannot be deleted; block them instead.',
                          confirmText: 'Delete',
                          type: 'danger'
                        });
                        if (!ok) return;
                        try {
                          await vendorsApi.remove(vendorId, workspaceId);
                          showToast({ variant: 'success', message: `${vendor.name} deleted` });
                          onChanged();
                          onClose();
                        } catch (error) {
                          showToast({ variant: 'error', message: toDisplayErrorMessage(error) });
                        }
                      }}
                      variant="ghost"
                    >
                      Delete
                    </Button>
                  </div>
                </>
              ) : null}

              {tab === 'assessment' ? (
                <>
                  <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 text-[13px] text-slate-600">
                    {vendor.assessmentCompletedAt ? (
                      <>
                        Completed {shortDate(vendor.assessmentCompletedAt)}
                        {vendor.assessmentCompletedBy ? ` by ${userLabel(vendor.assessmentCompletedBy)}` : ''}. Next review{' '}
                        <span className={cn('font-medium', vendor.reviewDue ? 'text-red-600' : 'text-slate-900')}>
                          {shortDate(vendor.nextReviewAt)}
                        </span>
                        .
                      </>
                    ) : (
                      'Due diligence before approval. Controls you confirm here lower the residual risk.'
                    )}
                  </div>
                  {sections.map((section) => (
                    <fieldset className="m-0 space-y-3 rounded-xl border border-slate-200 p-3" key={section}>
                      <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{section}</legend>
                      {questions
                        .filter((q) => q.section === section)
                        .map((q) => (
                          <div className="grid gap-1" data-testid={`question-${q.id}`} key={q.id}>
                            <label className="text-[13px] font-medium text-slate-800" htmlFor={`q-${q.id}`}>
                              {q.text}
                              {q.required ? <span className="text-red-500"> *</span> : null}
                            </label>
                            {q.type === 'text' ? (
                              <input
                                className={inputClass}
                                id={`q-${q.id}`}
                                maxLength={500}
                                onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                                value={answers[q.id] ?? ''}
                              />
                            ) : q.type === 'date' ? (
                              <input
                                className={inputClass}
                                id={`q-${q.id}`}
                                onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                                type="date"
                                value={answers[q.id] ?? ''}
                              />
                            ) : (
                              <select
                                className={selectClass}
                                id={`q-${q.id}`}
                                onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                                value={answers[q.id] ?? ''}
                              >
                                <option value="">Not answered</option>
                                {(q.type === 'yes_no'
                                  ? [
                                      { value: 'yes', label: 'Yes' },
                                      { value: 'no', label: 'No' }
                                    ]
                                  : (q.options ?? [])
                                ).map((option) => (
                                  <option key={option.value} value={option.value}>
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                            )}
                            <span className="text-xs text-slate-400">
                              {q.hint ? `${q.hint} · ` : ''}
                              {q.framework}
                            </span>
                          </div>
                        ))}
                    </fieldset>
                  ))}
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      loading={busy}
                      onClick={() => void act(() => vendorsApi.saveAssessment(vendorId, answers, false, workspaceId), 'Draft saved')}
                    >
                      Save draft
                    </Button>
                    <Button
                      disabled={missing > 0}
                      loading={busy}
                      onClick={() => void act(() => vendorsApi.saveAssessment(vendorId, answers, true, workspaceId), 'Assessment completed')}
                      variant="primary"
                    >
                      {vendor.assessmentCompletedAt ? 'Complete reassessment' : 'Complete assessment'}
                    </Button>
                    {missing > 0 ? <span className="text-xs text-slate-500">{missing} required question(s) left</span> : null}
                  </div>
                </>
              ) : null}

              {tab === 'evidence' ? (
                <>
                  <div className="space-y-3 rounded-xl border border-slate-200 p-3">
                    <div className="text-[13px] font-medium text-slate-700">Add a file</div>
                    <input
                      accept={EVIDENCE_ACCEPT}
                      aria-label="Evidence file"
                      className="block w-full text-[13px] text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-[13px] file:font-medium file:text-slate-700 hover:file:bg-slate-200"
                      onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                      ref={fileInput}
                      type="file"
                    />
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field label="Kind">
                        <select className={selectClass} onChange={(e) => setEvidenceKind(e.target.value as EvidenceKind)} value={evidenceKind}>
                          {(Object.keys(EVIDENCE_KIND_LABELS) as EvidenceKind[]).map((k) => (
                            <option key={k} value={k}>
                              {EVIDENCE_KIND_LABELS[k]}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Field hint="You are reminded 30 days before" label="Valid until">
                        <input className={inputClass} onChange={(e) => setEvidenceExpiry(e.target.value)} type="date" value={evidenceExpiry} />
                      </Field>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        disabled={!file || file.size > 15 * 1024 * 1024}
                        icon={Upload}
                        loading={busy}
                        onClick={() => void upload()}
                        variant="primary"
                      >
                        Upload
                      </Button>
                      <span className="text-xs text-slate-500">
                        {file && file.size > 15 * 1024 * 1024 ? 'Files can be up to 15 MB.' : 'PDF, Word, Excel, images or text; up to 15 MB.'}
                      </span>
                    </div>
                  </div>
                  {vendor.evidence.length === 0 ? (
                    <p className="m-0 text-[13px] text-slate-500">
                      No evidence yet. Upload the vendor&apos;s SOC 2 report or ISO certificate and its DPA.
                    </p>
                  ) : (
                    <ul className="m-0 list-none divide-y divide-slate-100 rounded-xl border border-slate-200 p-0">
                      {vendor.evidence.map((item) => {
                        const expired = isPast(item.expiresAt);
                        return (
                          <li className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5" data-testid="evidence-row" key={item.id}>
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="truncate text-[13px] font-medium text-slate-900">{item.name}</span>
                                <Badge tone="neutral">{EVIDENCE_KIND_LABELS[item.kind]}</Badge>
                                {expired ? <Badge tone="danger">Expired</Badge> : null}
                              </div>
                              <div className="text-xs text-slate-500">
                                {formatBytes(item.size)} · added {timeAgo(item.createdAt)}
                                {item.uploadedBy ? ` by ${userLabel(item.uploadedBy)}` : ''}
                                {item.expiresAt ? ` · valid until ${shortDate(item.expiresAt)}` : ''}
                              </div>
                            </div>
                            <div className="flex gap-1">
                              <Button
                                aria-label={`Download ${item.name}`}
                                icon={Download}
                                onClick={async () => {
                                  try {
                                    saveBlob(await vendorsApi.downloadEvidence(vendorId, item.id, workspaceId), item.name);
                                  } catch (error) {
                                    showToast({
                                      variant: 'error',
                                      message: toDisplayErrorMessage(error)
                                    });
                                  }
                                }}
                                size="icon-sm"
                                variant="ghost"
                              />
                              <Button
                                aria-label={`Delete ${item.name}`}
                                icon={Trash2}
                                onClick={async () => {
                                  const ok = await confirm({
                                    title: `Delete ${item.name}?`,
                                    message: 'The file is deleted for good.',
                                    confirmText: 'Delete',
                                    type: 'danger'
                                  });
                                  if (ok) await act(() => vendorsApi.deleteEvidence(vendorId, item.id, workspaceId), 'File deleted');
                                }}
                                size="icon-sm"
                                variant="ghost"
                              />
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                  <p className="m-0 text-xs text-slate-400">
                    Files are stored in your database, checked against their type and always downloaded, never opened in the browser.
                  </p>
                </>
              ) : null}

              {tab === 'usage' ? (
                <>
                  <div>
                    <div className="mb-2 text-[13px] font-medium text-slate-700">Agents ({vendor.agents.length})</div>
                    {vendor.agents.length === 0 ? (
                      <p className="m-0 text-[13px] text-slate-500">No agents use this vendor.</p>
                    ) : (
                      <ul className="m-0 list-none divide-y divide-slate-100 rounded-xl border border-slate-200 p-0">
                        {vendor.agents.map((agent) => (
                          <li className="flex flex-wrap items-center justify-between gap-2 px-3 py-2" key={agent.id}>
                            <div className="min-w-0">
                              <div className="text-[13px] font-medium text-slate-900">{agent.name}</div>
                              <div className="text-xs text-slate-500">
                                {agent.callCount.toLocaleString()} calls · last active {timeAgo(agent.lastSeenAt)}
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <KindLabel kind={agent.kind} />
                              <StatusBadge status={agent.status} />
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div>
                    <div className="mb-2 text-[13px] font-medium text-slate-700">Webhooks ({vendor.webhooks.length})</div>
                    {vendor.webhooks.length === 0 ? (
                      <p className="m-0 text-[13px] text-slate-500">No webhooks send to this vendor.</p>
                    ) : (
                      <ul className="m-0 list-none divide-y divide-slate-100 rounded-xl border border-slate-200 p-0">
                        {vendor.webhooks.map((hook) => (
                          <li className="px-3 py-2" key={hook.id}>
                            <div className="text-[13px] font-medium text-slate-900">{hook.name}</div>
                            <div className="truncate font-mono text-xs text-slate-500">{hook.url.replace(/^(https?:\/\/[^/]+).*/, '$1/…')}</div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div>
                    <div className="mb-2 text-[13px] font-medium text-slate-700">Alerts</div>
                    {vendor.alerts.length === 0 ? (
                      <p className="m-0 text-[13px] text-slate-500">No alerts.</p>
                    ) : (
                      <ul className="m-0 list-none space-y-1.5 p-0">
                        {vendor.alerts.map((alert) => (
                          <li className="rounded-lg border border-slate-200 px-3 py-2 text-[13px]" key={alert.id}>
                            <span className="font-medium text-slate-900">{alert.title}</span>
                            <span className="block text-xs text-slate-500">
                              {timeAgo(alert.createdAt)}
                              {alert.acknowledgedAt ? ' · dismissed' : ''}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </>
              ) : null}

              {tab === 'history' ? (
                <ol className="m-0 list-none space-y-3 border-l border-slate-200 p-0 pl-4" data-testid="vendor-history">
                  {vendor.history.map((entry, index) => (
                    <li className="relative" key={`${entry.at}-${index}`}>
                      <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-slate-300" />
                      <div className="text-[13px] font-medium text-slate-900">
                        {HISTORY_LABELS[entry.action] ?? entry.action}
                        {entry.from || entry.to ? (
                          <span className="font-normal text-slate-600">
                            {' '}
                            {entry.from ? `${VENDOR_STATUS_LABELS[entry.from as VendorStatus] ?? entry.from} → ` : ''}
                            {VENDOR_STATUS_LABELS[entry.to as VendorStatus] ?? entry.to}
                          </span>
                        ) : null}
                      </div>
                      <div className="text-xs text-slate-500">
                        {new Date(entry.at).toLocaleString()}
                        {entry.by ? ` · ${userLabel(entry.by)}` : ' · automatic'}
                      </div>
                      {entry.note ? <p className="m-0 mt-0.5 text-[13px] text-slate-600">{entry.note}</p> : null}
                    </li>
                  ))}
                </ol>
              ) : null}
            </div>
          </>
        )}
      </aside>
    </div>,
    document.body
  );
}
