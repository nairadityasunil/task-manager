import { useState } from 'react';
import { Bot, Check, Copy, Cpu, KeyRound, MessageSquare, Smartphone, type LucideIcon } from 'lucide-react';

import { Badge, Button, cn, type BadgeTone } from '@/components/ui';
import {
  EFFECT_LABELS,
  KIND_LABELS,
  RISK_LEVEL_LABELS,
  type ActivityOutcome,
  type AgentKind,
  type AgentRiskLevel,
  type AgentStatus,
  type ApprovalStatus,
  type PolicyEffect,
  type RiskLevel
} from '@/services/agents';

export const KIND_ICONS: Record<AgentKind, LucideIcon> = {
  api_key: KeyRound,
  mcp_client: Bot,
  chatgpt: MessageSquare,
  companion: Smartphone,
  ai_provider: Cpu
};

const RISK_TONES: Record<AgentRiskLevel, BadgeTone> = {
  low: 'success',
  medium: 'info',
  high: 'warning',
  critical: 'danger'
};

export function RiskBadge({ level, score }: { level: AgentRiskLevel; score?: number }): JSX.Element {
  return (
    <Badge dot tone={RISK_TONES[level]}>
      {level.charAt(0).toUpperCase() + level.slice(1)}
      {score != null ? <span className="tabular-nums opacity-70">· {score}</span> : null}
    </Badge>
  );
}

const STATUS_TONES: Record<AgentStatus, BadgeTone> = {
  active: 'success',
  suspended: 'warning',
  revoked: 'neutral'
};

export function StatusBadge({ status }: { status: AgentStatus }): JSX.Element {
  return (
    <Badge dot tone={STATUS_TONES[status]}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}

const ACTION_RISK_TONES: Record<RiskLevel, BadgeTone> = {
  read: 'neutral',
  write: 'info',
  sensitive_write: 'orange',
  destructive: 'danger',
  security_critical: 'danger'
};

export function ActionRiskBadge({ risk }: { risk: RiskLevel }): JSX.Element {
  return <Badge tone={ACTION_RISK_TONES[risk]}>{RISK_LEVEL_LABELS[risk]}</Badge>;
}

const OUTCOME: Record<ActivityOutcome, { label: string; tone: BadgeTone }> = {
  allowed: { label: 'Allowed', tone: 'success' },
  blocked: { label: 'Blocked', tone: 'danger' },
  pending_approval: { label: 'Held for approval', tone: 'warning' },
  error: { label: 'Failed', tone: 'neutral' }
};

export function OutcomeBadge({ outcome }: { outcome: ActivityOutcome }): JSX.Element {
  return (
    <Badge dot tone={OUTCOME[outcome].tone}>
      {OUTCOME[outcome].label}
    </Badge>
  );
}

const APPROVAL: Record<ApprovalStatus, { label: string; tone: BadgeTone }> = {
  pending: { label: 'Waiting', tone: 'warning' },
  approved: { label: 'Approved', tone: 'info' },
  executed: { label: 'Approved and run', tone: 'success' },
  rejected: { label: 'Rejected', tone: 'neutral' },
  expired: { label: 'Expired', tone: 'neutral' },
  failed: { label: 'Approved, failed', tone: 'danger' }
};

export function ApprovalBadge({ status }: { status: ApprovalStatus }): JSX.Element {
  return (
    <Badge dot tone={APPROVAL[status].tone}>
      {APPROVAL[status].label}
    </Badge>
  );
}

const EFFECT_TONES: Record<PolicyEffect, BadgeTone> = {
  allow: 'success',
  deny: 'danger',
  require_approval: 'warning'
};

export function EffectBadge({ effect }: { effect: PolicyEffect }): JSX.Element {
  return <Badge tone={EFFECT_TONES[effect]}>{EFFECT_LABELS[effect]}</Badge>;
}

export function KindLabel({ kind, className }: { kind: AgentKind; className?: string }): JSX.Element {
  const Icon = KIND_ICONS[kind];
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-[13px] text-slate-600', className)}>
      <Icon className="h-3.5 w-3.5 text-slate-400" />
      {KIND_LABELS[kind]}
    </span>
  );
}

/** A secret shown once, with a copy button. */
export function SecretReveal({ value, label = 'Copy key' }: { value: string; label?: string }): JSX.Element {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex min-w-0 items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50/60 p-2">
      <code className="min-w-0 flex-1 break-all font-mono text-xs text-slate-900" data-testid="secret-value">
        {value}
      </code>
      <Button
        icon={copied ? Check : Copy}
        onClick={() => {
          void navigator.clipboard?.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }}
        size="sm"
        variant="primary"
      >
        {copied ? 'Copied' : label}
      </Button>
    </div>
  );
}
