import { useEffect, useState } from 'react';
import {
  BookCheck,
  Check,
  ExternalLink,
  Landmark,
  ListChecks,
  Scale,
  ShieldCheck,
  ToggleRight,
} from 'lucide-react';

import Modal from '@/components/Modal';
import { Badge, Button, Card, CardHeader, cn, type BadgeTone } from '@/components/ui';
import { useConfirm } from '@/context/ConfirmationContext';
import { useToast } from '@/context/ToastContext';
import {
  agentsApi,
  type PackApplyResult,
  type PackItemKind,
  type RegulationPack,
  type RegulationPackItem,
} from '@/services/agents';
import { toDisplayErrorMessage } from '@/utils/apiError';

const PACK_NAMES: Record<string, string> = {
  'eu-ai-act': 'EU AI Act',
  'ccpa-cpra': 'California CCPA / CPRA',
  'colorado-ai-act': 'Colorado AI Act',
  'india-dpdp': 'India DPDP Act',
  gdpr: 'GDPR',
  'uk-gdpr': 'UK GDPR',
  'nyc-ll144': 'NYC Local Law 144',
  'illinois-aivia': 'Illinois AI Video Interview Act',
  'utah-ai': 'Utah AI Policy Act',
  'singapore-pdpa': 'Singapore PDPA',
  'australia-privacy': 'Australia Privacy Act',
  'japan-appi': 'Japan APPI',
  'brazil-lgpd': 'Brazil LGPD',
  'canada-pipeda': 'Canada PIPEDA',
  'korea-pipa': 'South Korea PIPA',
};

/** "EU AI Act" for a policy installed by that pack. */
export const packName = (id: string): string => PACK_NAMES[id] ?? id;

const GROUPS: Array<{ kind: PackItemKind; title: string; hint: string; icon: typeof ShieldCheck }> =
  [
    {
      kind: 'policy',
      title: 'Enforced by policies',
      hint: 'Agent actions are blocked, held for a person or logged.',
      icon: ShieldCheck,
    },
    {
      kind: 'setting',
      title: 'Protections switched on',
      hint: 'Applying never turns a protection off.',
      icon: ToggleRight,
    },
    { kind: 'built_in', title: 'Always on in Pristine', hint: 'Nothing to set up.', icon: Check },
    {
      kind: 'manual',
      title: 'Your to-dos',
      hint: 'Pristine cannot do these for you.',
      icon: ListChecks,
    },
  ];

function statusBadge(item: RegulationPackItem): { label: string; tone: BadgeTone } {
  switch (item.status) {
    case 'installed':
      return item.policy?.mode === 'enforce'
        ? { label: 'Enforced', tone: 'dark' }
        : { label: 'Advisory', tone: 'neutral' };
    case 'proposed':
      return { label: 'Waiting for a second admin', tone: 'warning' };
    case 'not_installed':
      return { label: 'Not applied', tone: 'neutral' };
    case 'met':
      return { label: 'On', tone: 'success' };
    case 'not_met':
      return {
        label: item.optional ? 'Optional' : 'Off',
        tone: item.optional ? 'neutral' : 'warning',
      };
    case 'built_in':
      return { label: 'Built in', tone: 'success' };
    default:
      return { label: 'Your to-do', tone: 'info' };
  }
}

const summary = (r: PackApplyResult): string => {
  const parts = [
    r.policies.created ? `${r.policies.created} policy(ies) added` : '',
    r.policies.updated ? `${r.policies.updated} updated` : '',
    r.policies.proposed ? `${r.policies.proposed} sent to a second admin` : '',
    r.settingsChanged.length ? `${r.settingsChanged.length} protection(s) switched on` : '',
  ].filter(Boolean);
  return parts.length ? parts.join(', ') : 'Already applied';
};

function PackDetail({
  pack,
  busy,
  onApply,
  onRemove,
  onClose,
}: {
  pack: RegulationPack;
  busy: string | null;
  onApply: (start: 'recommended' | 'advisory', itemId?: string) => void;
  onRemove: () => void;
  onClose: () => void;
}): JSX.Element {
  return (
    <Modal
      description={pack.jurisdiction}
      footer={
        <div className="flex w-full flex-wrap items-center gap-2">
          {pack.applied ? (
            <Button
              disabled={busy != null}
              loading={busy === 'remove'}
              onClick={onRemove}
              variant="ghost"
            >
              Remove pack
            </Button>
          ) : null}
          <div className="ml-auto flex flex-wrap gap-2">
            <Button
              disabled={busy != null}
              loading={busy === 'advisory'}
              onClick={() => onApply('advisory')}
              title="Policies only log what they would do and protections never block, so you can see the effect first."
            >
              Start in advisory
            </Button>
            <Button
              disabled={busy != null}
              loading={busy === 'recommended'}
              onClick={() => onApply('recommended')}
              variant="primary"
            >
              {pack.applied ? 'Re-apply as recommended' : 'Apply as recommended'}
            </Button>
          </div>
        </div>
      }
      maxWidth="max-w-3xl"
      onClose={onClose}
      title={`${pack.name} pack`}
    >
      <div className="space-y-4" data-testid="pack-detail">
        <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs leading-relaxed text-slate-600">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <Landmark className="h-3.5 w-3.5 text-slate-400" />
            <span className="font-medium text-slate-800">{pack.source}</span>
            <a
              className="inline-flex items-center gap-1 font-medium text-brand-700 hover:underline"
              href={pack.url}
              rel="noreferrer noopener"
              target="_blank"
            >
              Official text <ExternalLink className="h-3 w-3" />
            </a>
          </div>
          <p className="m-0">{pack.scope}</p>
          <p className="m-0 text-slate-500">
            This pack helps you meet these obligations for the agents Pristine governs. It is not
            legal advice and does not on its own make your organisation compliant.
          </p>
        </div>

        {GROUPS.map((group) => {
          const items = pack.items.filter((i) => i.kind === group.kind);
          if (!items.length) return null;
          const Icon = group.icon;
          return (
            <section aria-label={group.title} key={group.kind}>
              <div className="mb-1.5 flex items-baseline gap-2">
                <Icon className="h-3.5 w-3.5 self-center text-slate-400" />
                <h3 className="m-0 text-[13px] font-semibold text-slate-900">{group.title}</h3>
                <span className="hidden text-xs text-slate-500 sm:inline">{group.hint}</span>
              </div>
              <ul className="m-0 list-none divide-y divide-slate-100 rounded-lg border border-slate-200 p-0">
                {items.map((item) => {
                  const badge = statusBadge(item);
                  const canApplyItem = item.kind === 'setting' && item.status === 'not_met';
                  return (
                    <li
                      className="flex flex-wrap items-start gap-x-3 gap-y-1.5 px-3 py-2.5"
                      data-testid="pack-item"
                      key={item.id}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[13px] font-medium text-slate-900">
                            {item.title}
                          </span>
                          <Badge tone={badge.tone}>{badge.label}</Badge>
                        </div>
                        <div className="mt-0.5 font-mono text-[11px] text-slate-500">
                          {item.basis}
                        </div>
                        <p className="m-0 mt-1 text-xs leading-relaxed text-slate-600">
                          {item.howCovered}
                        </p>
                      </div>
                      {canApplyItem ? (
                        <Button
                          disabled={busy != null}
                          loading={busy === item.id}
                          onClick={() => onApply('recommended', item.id)}
                          size="sm"
                        >
                          Switch on
                        </Button>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </Modal>
  );
}

const SECTIONS: Array<{ category: RegulationPack['category']; title: string }> = [
  { category: 'ai', title: 'AI laws' },
  { category: 'privacy', title: 'Privacy and data protection laws' },
];

/** Rules & approvals → Policies: packs for real AI and privacy laws. */
export function RegulationPacks({
  workspaceId,
  onChanged,
}: {
  workspaceId: string | null;
  onChanged: () => void;
}): JSX.Element {
  const { showToast } = useToast();
  const confirm = useConfirm();
  const [packs, setPacks] = useState<RegulationPack[] | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    agentsApi
      .policyPacks(workspaceId)
      .then(setPacks)
      .catch(() => setPacks([]));
  }, [workspaceId]);

  const open = packs?.find((p) => p.id === openId) ?? null;

  const apply = async (
    pack: RegulationPack,
    start: 'recommended' | 'advisory',
    itemId?: string,
  ) => {
    setBusy(itemId ?? start);
    try {
      const { result, packs: next } = await agentsApi.applyPolicyPack(
        pack.id,
        { start, itemId },
        workspaceId,
      );
      setPacks(next);
      showToast({ variant: 'success', message: `${pack.name}: ${summary(result)}` });
      onChanged();
    } catch (error) {
      showToast({ variant: 'error', message: toDisplayErrorMessage(error) });
    } finally {
      setBusy(null);
    }
  };

  const remove = async (pack: RegulationPack) => {
    const ok = await confirm({
      title: `Remove the ${pack.name} pack?`,
      message:
        'Its policies are removed. Protections it switched on stay on; turn them off in Settings if you need to.',
      confirmText: 'Remove pack',
      type: 'danger',
    });
    if (!ok) return;
    setBusy('remove');
    try {
      const { result, packs: next } = await agentsApi.removePolicyPack(pack.id, workspaceId);
      setPacks(next);
      showToast({
        variant: 'success',
        message: result.proposed ? `Removal sent to a second admin` : `${pack.name} pack removed`,
      });
      onChanged();
    } catch (error) {
      showToast({ variant: 'error', message: toDisplayErrorMessage(error) });
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card data-testid="regulation-packs">
      <CardHeader
        description="Policies mapped to real laws. Each item cites its provision and says what Pristine enforces and what stays with you."
        icon={<Scale className="h-4 w-4 text-slate-400" />}
        title="Regulation packs"
      />
      {packs == null ? (
        <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div className="h-[104px] animate-pulse rounded-lg bg-slate-100" key={i} />
          ))}
        </div>
      ) : (
        <div className="space-y-4 p-4">
          {SECTIONS.map((section) => {
            const list = packs.filter((p) => p.category === section.category);
            if (!list.length) return null;
            return (
              <section aria-label={section.title} key={section.category}>
                <h3 className="m-0 mb-2 text-xs font-medium text-slate-500">
                  {section.title} · {list.length}
                </h3>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {list.map((pack) => {
                    const todos = pack.items.filter((i) => i.kind === 'manual').length;
                    const complete = pack.progress.done === pack.progress.total;
                    return (
                      <button
                        className={cn(
                          'card-hover rounded-lg border bg-white p-3 text-left',
                          pack.applied ? 'border-slate-300' : 'border-dashed border-slate-300',
                        )}
                        data-testid="pack-tile"
                        key={pack.id}
                        onClick={() => setOpenId(pack.id)}
                        type="button"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-[13px] font-semibold text-slate-900">
                            {pack.name}
                          </span>
                          {pack.applied ? (
                            <Badge tone={complete ? 'success' : 'warning'}>
                              {complete ? 'Applied' : 'Partly applied'}
                            </Badge>
                          ) : null}
                        </div>
                        <div className="mt-0.5 text-xs text-slate-500">{pack.jurisdiction}</div>
                        <div className="mt-2.5 flex items-center gap-2">
                          <span
                            aria-hidden
                            className="h-1 flex-1 overflow-hidden rounded bg-slate-100"
                          >
                            <span
                              className="block h-full rounded bg-slate-900"
                              style={{
                                width: `${pack.progress.total ? (pack.progress.done / pack.progress.total) * 100 : 0}%`,
                              }}
                            />
                          </span>
                          <span className="font-mono text-[11px] text-slate-500">
                            {pack.progress.done}/{pack.progress.total}
                          </span>
                        </div>
                        <div className="mt-1.5 flex items-center gap-1 text-[11px] text-slate-500">
                          <BookCheck className="h-3 w-3" /> {todos} to-do{todos === 1 ? '' : 's'}{' '}
                          for you
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}
      {open ? (
        <PackDetail
          busy={busy}
          onApply={(start, itemId) => void apply(open, start, itemId)}
          onClose={() => setOpenId(null)}
          onRemove={() => void remove(open)}
          pack={open}
        />
      ) : null}
    </Card>
  );
}
