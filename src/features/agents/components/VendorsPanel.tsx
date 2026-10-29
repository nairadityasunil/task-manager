import { useEffect, useMemo, useState } from 'react';
import { Building2, CalendarClock, Download, FileText, Plus, Search, X } from 'lucide-react';

import EmptyState from '@/components/EmptyState';
import { Badge, Button, Card, CardHeader, Field, cn, inputClass, selectClass } from '@/components/ui';
import { useToast } from '@/context/ToastContext';
import { timeAgo } from '@/services/agents';
import {
  SOURCE_LABELS,
  VENDOR_CATEGORY_LABELS,
  VENDOR_STATUS_LABELS,
  saveBlob,
  vendorsApi,
  type CatalogVendor,
  type VendorCategory,
  type VendorListItem,
  type VendorStatus
} from '@/services/vendors';
import { toDisplayErrorMessage } from '@/utils/apiError';
import { RiskBadge } from './shared';
import { VendorStatusBadge } from './VendorDrawer';

const isPast = (iso?: string | null) => Boolean(iso && new Date(iso).getTime() < Date.now());

/** Newly found vendors nobody has decided on yet (overview). */
export function VendorReviewCard({ vendors, onOpen }: { vendors: VendorListItem[]; onOpen: (vendor: VendorListItem) => void }): JSX.Element | null {
  const waiting = vendors.filter((v) => v.status === 'under_review' || v.reviewDue);
  if (waiting.length === 0) return null;
  return (
    <Card data-testid="vendor-review-card">
      <CardHeader
        description="Third parties your agents and integrations use. Approve, restrict or block each, and reassess on schedule."
        icon={<Building2 className="h-4 w-4 text-slate-400" />}
        title={`Vendors to review (${waiting.length})`}
      />
      <ul className="m-0 list-none divide-y divide-slate-100 p-0">
        {waiting.slice(0, 6).map((vendor) => (
          <li className="flex flex-wrap items-center justify-between gap-3 px-4 py-3" key={vendor.id}>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[13px] font-medium text-slate-900">{vendor.name}</span>
                <VendorStatusBadge status={vendor.status} />
                <RiskBadge level={vendor.riskLevel} score={vendor.residualRisk} />
              </div>
              <p className="m-0 mt-0.5 text-xs text-slate-500">
                {vendor.reviewDue && vendor.status !== 'under_review' ? 'Reassessment overdue' : `Found ${timeAgo(vendor.firstSeenAt)}`} ·{' '}
                {vendor.agentCount} agent(s)
              </p>
            </div>
            <Button onClick={() => onOpen(vendor)} size="sm">
              Review
            </Button>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function AddVendor({
  workspaceId,
  onAdded,
  onClose
}: {
  workspaceId: string | null;
  onAdded: (id: string) => void;
  onClose: () => void;
}): JSX.Element {
  const { showToast } = useToast();
  const [catalog, setCatalog] = useState<CatalogVendor[] | null>(null);
  const [name, setName] = useState('');
  const [website, setWebsite] = useState('');
  const [category, setCategory] = useState<VendorCategory>('other');
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    vendorsApi
      .catalog(workspaceId)
      .then(setCatalog)
      .catch(() => setCatalog([]));
  }, [workspaceId]);

  const add = async (body: Parameters<typeof vendorsApi.create>[0], label: string) => {
    setBusy(label);
    try {
      const vendor = await vendorsApi.create(body, workspaceId);
      showToast({ variant: 'success', message: `${vendor.name} added to the register` });
      onAdded(vendor.id);
    } catch (error) {
      showToast({ variant: 'error', message: toDisplayErrorMessage(error) });
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card data-testid="add-vendor">
      <CardHeader
        actions={<Button aria-label="Close" icon={X} onClick={onClose} size="icon-sm" variant="ghost" />}
        description="Vendors your agents use are added automatically. Add others you depend on here."
        icon={<Plus className="h-4 w-4 text-slate-400" />}
        title="Add a vendor"
      />
      <div className="space-y-4 p-4">
        {catalog == null ? (
          <div className="h-10 animate-pulse rounded-lg bg-slate-100" />
        ) : catalog.length ? (
          <div className="flex flex-wrap gap-1.5">
            {catalog.map((entry) => (
              <Button
                key={entry.key}
                loading={busy === entry.key}
                onClick={() => void add({ key: entry.key }, entry.key)}
                size="sm"
                title={entry.purpose}
              >
                {entry.name}
              </Button>
            ))}
          </div>
        ) : null}
        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_180px_auto] sm:items-end">
          <Field label="Name">
            <input className={inputClass} maxLength={80} onChange={(e) => setName(e.target.value)} placeholder="e.g. Acme Analytics" value={name} />
          </Field>
          <Field label="Website">
            <input className={inputClass} maxLength={300} onChange={(e) => setWebsite(e.target.value)} placeholder="https://" value={website} />
          </Field>
          <Field label="Category">
            <select className={selectClass} onChange={(e) => setCategory(e.target.value as VendorCategory)} value={category}>
              {(Object.keys(VENDOR_CATEGORY_LABELS) as VendorCategory[]).map((c) => (
                <option key={c} value={c}>
                  {VENDOR_CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>
          </Field>
          <Button
            disabled={!name.trim()}
            loading={busy === 'custom'}
            onClick={() => void add({ name: name.trim(), website: website.trim() || undefined, category }, 'custom')}
            variant="primary"
          >
            Add
          </Button>
        </div>
      </div>
    </Card>
  );
}

interface VendorsPanelProps {
  canAdmin: boolean;
  workspaceId: string | null;
  vendors: VendorListItem[] | null;
  onOpen: (vendorId: string) => void;
  onChanged: () => void;
}

export function VendorsPanel({ canAdmin, workspaceId, vendors, onOpen, onChanged }: VendorsPanelProps): JSX.Element {
  const { showToast } = useToast();
  const [adding, setAdding] = useState(false);
  const [status, setStatus] = useState<VendorStatus | ''>('');
  const [query, setQuery] = useState('');

  const visible = useMemo(
    () =>
      (vendors ?? []).filter(
        (vendor) => (!status || vendor.status === status) && (!query || vendor.name.toLowerCase().includes(query.toLowerCase()))
      ),
    [vendors, status, query]
  );

  if (!canAdmin) {
    return <EmptyState description="Workspace owners and admins manage the vendor register." icon={Building2} title="Admins only" />;
  }

  const download = async (kind: 'register' | 'subprocessors', format: 'csv' | 'json') => {
    try {
      const blob =
        kind === 'register' ? await vendorsApi.exportRegister(format, workspaceId) : await vendorsApi.exportSubprocessors(format, workspaceId);
      saveBlob(blob, `${kind === 'register' ? 'vendor-register' : 'sub-processors'}-${new Date().toISOString().slice(0, 10)}.${format}`);
    } catch (error) {
      showToast({ variant: 'error', message: toDisplayErrorMessage(error) });
    }
  };

  const counts = (vendors ?? []).reduce<Record<string, number>>((acc, v) => ({ ...acc, [v.status]: (acc[v.status] ?? 0) + 1 }), {});

  return (
    <div className="space-y-4">
      {adding ? (
        <AddVendor
          onAdded={(id) => {
            setAdding(false);
            onChanged();
            onOpen(id);
          }}
          onClose={() => setAdding(false)}
          workspaceId={workspaceId}
        />
      ) : null}
      <Card>
        <div className="grid gap-2 border-b border-slate-100 p-3 sm:flex sm:flex-wrap sm:items-center">
          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              aria-label="Search vendors"
              className={cn(inputClass, 'h-8 pl-8')}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search vendors"
              value={query}
            />
          </div>
          <select
            aria-label="Vendor status"
            className={cn(selectClass, 'h-8 sm:w-48')}
            onChange={(e) => setStatus(e.target.value as VendorStatus | '')}
            value={status}
          >
            <option value="">All statuses</option>
            {(Object.keys(VENDOR_STATUS_LABELS) as VendorStatus[]).map((s) => (
              <option key={s} value={s}>
                {VENDOR_STATUS_LABELS[s]} ({counts[s] ?? 0})
              </option>
            ))}
          </select>
          <div className="flex flex-wrap gap-1.5 sm:ml-auto">
            <Button icon={Download} onClick={() => void download('register', 'csv')} size="sm">
              Register CSV
            </Button>
            <Button icon={Download} onClick={() => void download('register', 'json')} size="sm" variant="ghost">
              JSON
            </Button>
            <Button icon={FileText} onClick={() => void download('subprocessors', 'csv')} size="sm">
              Sub-processors
            </Button>
            {!adding ? (
              <Button icon={Plus} onClick={() => setAdding(true)} size="sm" variant="primary">
                Add vendor
              </Button>
            ) : null}
          </div>
        </div>
        {vendors == null ? (
          <div className="space-y-2 p-4">
            {[0, 1, 2].map((i) => (
              <div className="h-11 animate-pulse rounded-lg bg-slate-100" key={i} />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div className="p-4">
            <EmptyState
              compact
              description="Vendors appear when an AI provider, MCP client, ChatGPT or a webhook destination is used, or when you add one."
              icon={Building2}
              title="No vendors found"
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-[13px]">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs text-slate-500">
                <tr>
                  <th className="px-4 py-2 font-medium">Vendor</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Residual risk</th>
                  <th className="px-3 py-2 font-medium">Tier</th>
                  <th className="px-3 py-2 font-medium">Used by</th>
                  <th className="px-3 py-2 font-medium">Next review</th>
                  <th className="px-4 py-2 font-medium">AI spend, 30d</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visible.map((vendor) => (
                  <tr className="cursor-pointer hover:bg-slate-50/70" data-testid="vendor-row" key={vendor.id} onClick={() => onOpen(vendor.id)}>
                    <td className="px-4 py-2.5">
                      <button className="text-left font-medium text-slate-900 hover:text-emerald-700" type="button">
                        {vendor.name}
                      </button>
                      <div className="text-xs text-slate-400">
                        {VENDOR_CATEGORY_LABELS[vendor.category]} · {vendor.sources.map((s) => SOURCE_LABELS[s] ?? s).join(', ')}
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <VendorStatusBadge status={vendor.status} />
                      {vendor.openAlerts ? (
                        <Badge className="ml-1.5" tone="warning">
                          {vendor.openAlerts} alert(s)
                        </Badge>
                      ) : null}
                    </td>
                    <td className="px-3 py-2.5">
                      <RiskBadge level={vendor.riskLevel} score={vendor.residualRisk} />
                    </td>
                    <td className="px-3 py-2.5 text-slate-600">{vendor.tier}</td>
                    <td className="px-3 py-2.5 text-xs text-slate-600">
                      {vendor.agentCount} agent(s)
                      <div className="text-slate-400">{vendor.evidenceCount} file(s) on record</div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5">
                      {vendor.nextReviewAt ? (
                        <span className={cn('inline-flex items-center gap-1', vendor.reviewDue ? 'font-medium text-red-600' : 'text-slate-600')}>
                          <CalendarClock className="h-3.5 w-3.5" />
                          {new Date(vendor.nextReviewAt).toLocaleDateString()}
                        </span>
                      ) : (
                        <span className="text-slate-400">Not assessed</span>
                      )}
                      {isPast(vendor.dpaExpiresAt) ? <div className="text-xs font-medium text-red-600">DPA expired</div> : null}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 tabular-nums text-slate-600">${vendor.spend30d.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
