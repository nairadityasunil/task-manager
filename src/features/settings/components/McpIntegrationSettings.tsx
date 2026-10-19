import React, { useState, useEffect } from 'react';
import {
  Bot,
  ShieldCheck,
  Key,
  Copy,
  Check,
  Cpu,
  RefreshCw,
  Search,
  Terminal,
  AlertTriangle,
  Layers,
  ChevronDown,
  ChevronUp,
  Smartphone,
} from 'lucide-react';
import { Badge, Button, Card, CardHeader, inputClass } from '@/components/ui';
import EmptyState from '@/components/EmptyState';
import { useToast } from '@/context/ToastContext';
import { useAuth } from '@/context/AuthContext';
import { useWorkspace } from '@/features/workspaces';
import { API_BASE_URL } from '@/services/api';
import { getMcpTools, type McpToolManifestEntry } from '@/services/mcp';
import type { CompanionDevice } from '../hooks/useSettings';

interface McpIntegrationSettingsProps {
  companionDevices?: CompanionDevice[];
  isLoadingCompanionDevices?: boolean;
  onRevokeCompanionDevice?: (id: string) => void;
  onNavigateToProfile?: () => void;
  onOpenCompanionModal?: () => void;
}

export const McpIntegrationSettings: React.FC<McpIntegrationSettingsProps> = ({
  companionDevices = [],
  isLoadingCompanionDevices = false,
  onRevokeCompanionDevice,
  onNavigateToProfile,
  onOpenCompanionModal,
}) => {
  const { user } = useAuth();
  const { activeWorkspace } = useWorkspace();
  const { showToast } = useToast();

  const userRole = activeWorkspace?.role ?? 'MEMBER';

  const [tools, setTools] = useState<McpToolManifestEntry[]>([]);
  const [isLoadingTools, setIsLoadingTools] = useState<boolean>(true);
  const [toolsError, setToolsError] = useState<string | null>(null);

  const [selectedDomain, setSelectedDomain] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeClientTab, setActiveClientTab] = useState<'claude' | 'cursor' | 'curl'>('claude');

  const [showSyncKey, setShowSyncKey] = useState<boolean>(false);
  const [expandedTool, setExpandedTool] = useState<string | null>(null);

  const [copiedKey, setCopiedKey] = useState<boolean>(false);
  const [copiedConfig, setCopiedConfig] = useState<boolean>(false);

  const mcpServerUrl = `${API_BASE_URL}/mcp`;

  const fetchTools = async () => {
    try {
      setIsLoadingTools(true);
      setToolsError(null);
      const manifest = await getMcpTools();
      setTools(manifest);
    } catch (err: unknown) {
      console.error('Failed to load MCP tool manifest', err);
      setToolsError('Could not connect to backend MCP tool registry.');
    } finally {
      setIsLoadingTools(false);
    }
  };

  useEffect(() => {
    fetchTools();
  }, []);

  const handleCopyKey = () => {
    if (!user?.syncApiKey) return;
    navigator.clipboard.writeText(user.syncApiKey);
    setCopiedKey(true);
    showToast({ variant: 'success', message: 'Sync API Key copied to clipboard' });
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const getClaudeConfig = () => {
    return JSON.stringify(
      {
        mcpServers: {
          todosync: {
            url: mcpServerUrl,
            headers: {
              'x-sync-key': user?.syncApiKey || 'YOUR_SYNC_API_KEY',
            },
          },
        },
      },
      null,
      2
    );
  };

  const getCursorConfig = () => {
    return `// In Cursor Settings -> Features -> MCP Servers\nName: TodoSync\nType: sse\nURL: ${mcpServerUrl}\nHeaders: {\n  "x-sync-key": "${user?.syncApiKey || 'YOUR_SYNC_API_KEY'}"\n}`;
  };

  const getCurlConfig = () => {
    return `# List tools\ncurl -X GET "${mcpServerUrl}/tools" \\\n  -H "x-sync-key: ${user?.syncApiKey || 'YOUR_SYNC_API_KEY'}"\n\n# Invoke tool\ncurl -X POST "${mcpServerUrl}/tools/task:search" \\\n  -H "x-sync-key: ${user?.syncApiKey || 'YOUR_SYNC_API_KEY'}" \\\n  -H "Content-Type: application/json" \\\n  -d '{"limit": 10}'`;
  };

  const handleCopyConfig = () => {
    const text =
      activeClientTab === 'claude'
        ? getClaudeConfig()
        : activeClientTab === 'cursor'
        ? getCursorConfig()
        : getCurlConfig();
    navigator.clipboard.writeText(text);
    setCopiedConfig(true);
    showToast({ variant: 'success', message: 'Configuration snippet copied to clipboard' });
    setTimeout(() => setCopiedConfig(false), 2000);
  };

  // Scope definitions with backend alignment
  const allScopes = [
    {
      scope: 'work:read',
      label: 'Work Read',
      description: 'Fetch tasks, projects, epics, and activity history.',
      isGranted: true,
    },
    {
      scope: 'work:write',
      label: 'Work Write',
      description: 'Create, update, assign, or delete tasks, projects, and epics.',
      isGranted: true,
    },
    {
      scope: 'collaboration:read',
      label: 'Collaboration Read',
      description: 'Read notes, task comments, and chat messages.',
      isGranted: true,
    },
    {
      scope: 'collaboration:write',
      label: 'Collaboration Write',
      description: 'Add comments, create notes, and extract tasks from chat.',
      isGranted: true,
    },
    {
      scope: 'analytics:read',
      label: 'Analytics Read',
      description: 'Access operational metrics, SLA analytics, and forecasts.',
      isGranted: true,
    },
    {
      scope: 'ai:execute',
      label: 'AI Execution',
      description: 'Run daily planning, task decomposition, and note generation.',
      isGranted: true,
    },
    {
      scope: 'prompt:read',
      label: 'Prompt Read',
      description: 'List and view Prompt Library templates and versions.',
      isGranted: true,
    },
    {
      scope: 'prompt:write',
      label: 'Prompt Write',
      description: 'Test prompts in playground and execute variable rendering.',
      isGranted: true,
    },
    {
      scope: 'workspace:admin',
      label: 'Workspace Admin',
      description: 'Manage workspace details and list workspace members.',
      isGranted: userRole === 'OWNER' || userRole === 'ADMIN',
    },
  ];

  // Tool filtering & domain breakdown
  const domains = ['all', ...Array.from(new Set(tools.map((t) => t.domain)))];

  const filteredTools = tools.filter((t) => {
    const matchesDomain = selectedDomain === 'all' || t.domain === selectedDomain;
    const matchesSearch =
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesDomain && matchesSearch;
  });

  const getRiskBadge = (risk: string) => {
    switch (risk) {
      case 'read':
        return <Badge tone="success">Read</Badge>;
      case 'write':
        return <Badge tone="warning">Write</Badge>;
      case 'sensitive_write':
        return (
          <span className="inline-flex items-center whitespace-nowrap rounded-full bg-orange-50 px-2 py-0.5 text-[11px] font-medium text-orange-700 ring-1 ring-inset ring-orange-200">
            Sensitive Write
          </span>
        );
      case 'destructive':
        return <Badge tone="danger">Destructive</Badge>;
      default:
        return <Badge tone="neutral">{risk}</Badge>;
    }
  };

  const clientTabs: Array<{ id: 'claude' | 'cursor' | 'curl'; label: string }> = [
    { id: 'claude', label: 'Claude Desktop' },
    { id: 'cursor', label: 'Cursor / VS Code' },
    { id: 'curl', label: 'cURL / HTTP' },
  ];

  return (
    <div className="space-y-5 font-sans">
      {/* MCP Overview */}
      <Card>
        <div className="flex flex-col justify-between gap-4 p-4 sm:p-5 md:flex-row md:items-center">
          <div className="max-w-2xl space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="success" className="gap-1.5">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500"></span>
                MCP Server Active
              </Badge>
              <Badge tone="neutral">
                <Cpu className="h-3 w-3" /> {tools.length} Tools Manifested
              </Badge>
              <Badge tone="warning">
                <ShieldCheck className="h-3 w-3" /> 2-Phase Risk Policy
              </Badge>
            </div>

            <h3 className="m-0 flex items-center gap-2 text-[15px] font-semibold text-slate-900">
              <Bot className="h-[18px] w-[18px] text-slate-500" /> Model Context Protocol (MCP) Integration
            </h3>

            <p className="m-0 text-[13px] leading-relaxed text-slate-500">
              Expose TodoSync&apos;s 74+ domain capabilities (Tasks, Projects, SLA, Priority, Analytics, Intelligence) to external AI clients like Claude Desktop, Cursor, and custom autonomous agents.
            </p>
          </div>

          {onNavigateToProfile && (
            <Button size="sm" icon={Key} onClick={onNavigateToProfile} className="self-start md:self-auto">
              Manage Sync Key
            </Button>
          )}
        </div>
      </Card>

      {/* Setup & Connection */}
      <Card>
        <CardHeader
          title={
            <span className="flex items-center gap-1.5">
              <Terminal className="h-4 w-4 text-slate-400" /> MCP Server Connection & Setup
            </span>
          }
          description="Configure supported AI clients to communicate with your TodoSync workspace backend."
        />
        <div className="space-y-4 p-4 sm:p-5">
          {/* Sync API Key Bar */}
          <div className="flex flex-col justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50/60 p-3 lg:flex-row lg:items-center">
            <div className="min-w-0 space-y-0.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-slate-900">Your Sync API Key</span>
                <span className="font-mono text-xs text-slate-500">Header: x-sync-key</span>
              </div>
              <p className="m-0 text-[13px] text-slate-500">Used by MCP clients to authenticate calls. Keep private.</p>
            </div>

            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <code className="flex h-8 min-w-0 max-w-full items-center truncate rounded-lg border border-slate-200 bg-white px-2.5 font-mono text-xs text-slate-800">
                {showSyncKey
                  ? user?.syncApiKey || 'No Key Generated'
                  : user?.syncApiKey
                  ? `${user.syncApiKey.slice(0, 8)}...${user.syncApiKey.slice(-4)}`
                  : '••••••••••••••••'}
              </code>
              <Button size="sm" onClick={() => setShowSyncKey(!showSyncKey)}>
                {showSyncKey ? 'Hide' : 'Show'}
              </Button>
              <Button size="sm" variant="primary" onClick={handleCopyKey} disabled={!user?.syncApiKey}>
                {copiedKey ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                {copiedKey ? 'Copied' : 'Copy Key'}
              </Button>
            </div>
          </div>

          {/* Client tabs + config snippet */}
          <div className="overflow-hidden rounded-lg border border-slate-800 bg-slate-900">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 px-2 py-1.5">
              <div className="flex gap-1 overflow-x-auto hide-scrollbar">
                {clientTabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveClientTab(tab.id)}
                    className={`h-7 shrink-0 whitespace-nowrap rounded-md px-2.5 text-xs font-medium transition ${
                      activeClientTab === tab.id ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={handleCopyConfig}
                className="flex h-7 items-center gap-1 rounded-md px-2 text-xs text-slate-300 transition hover:bg-slate-800 hover:text-white"
              >
                {copiedConfig ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                {copiedConfig ? 'Copied' : 'Copy Snippet'}
              </button>
            </div>
            <div className="px-3.5 pt-2.5 text-xs text-slate-500">
              {activeClientTab === 'claude'
                ? 'claude_desktop_config.json'
                : activeClientTab === 'cursor'
                ? 'Cursor Features -> MCP Settings'
                : 'cURL Example'}
            </div>
            <pre className="m-0 overflow-x-auto whitespace-pre p-3.5 pt-2 font-mono text-xs leading-relaxed text-slate-100">
              {activeClientTab === 'claude'
                ? getClaudeConfig()
                : activeClientTab === 'cursor'
                ? getCursorConfig()
                : getCurlConfig()}
            </pre>
          </div>
        </div>
      </Card>

      {/* Authorized Scopes */}
      <Card>
        <CardHeader
          title={
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-slate-400" /> Authorized Scopes & Security Policy
            </span>
          }
          description={`Scopes automatically enforced by backend policy based on your authenticated role (${userRole}).`}
        />
        <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 sm:p-5 xl:grid-cols-3">
          {allScopes.map((item) => (
            <div
              key={item.scope}
              className={`space-y-1 rounded-lg border border-slate-200 p-3 ${item.isGranted ? 'bg-white' : 'bg-slate-50 opacity-70'}`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-slate-900">{item.label}</span>
                {item.isGranted ? <Badge tone="success">Granted</Badge> : <Badge tone="neutral">Restricted</Badge>}
              </div>
              <code className="block font-mono text-xs text-slate-500">{item.scope}</code>
              <p className="m-0 text-[13px] leading-snug text-slate-600">{item.description}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Connected Companion Devices */}
      <Card>
        <CardHeader
          title={
            <span className="flex items-center gap-1.5">
              <Smartphone className="h-4 w-4 text-slate-400" /> Connected MCP Client Devices
            </span>
          }
          description="Manage paired companion devices and external keys with access to your workspace."
          actions={
            onOpenCompanionModal ? (
              <Button size="sm" variant="primary" onClick={onOpenCompanionModal}>
                + Pair Companion Client
              </Button>
            ) : null
          }
        />
        <div className="p-4 sm:p-5">
          {isLoadingCompanionDevices ? (
            <div className="flex items-center justify-center gap-2 p-6 text-[13px] text-slate-500">
              <RefreshCw className="h-4 w-4 animate-spin" /> Loading client devices...
            </div>
          ) : companionDevices.length === 0 ? (
            <EmptyState
              compact
              icon={Smartphone}
              title="No companion client devices paired yet."
              description="Use your Sync API Key directly in Claude Desktop or pair a companion device for isolated access."
            />
          ) : (
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50">
                  <tr className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    <th className="px-3 py-2.5 font-medium">Device / Client Name</th>
                    <th className="px-3 py-2.5 font-medium">Type</th>
                    <th className="px-3 py-2.5 font-medium">Status</th>
                    <th className="px-3 py-2.5 font-medium">Paired Date</th>
                    <th className="px-3 py-2.5 text-right font-medium">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {companionDevices.map((dev) => (
                    <tr key={dev.id} className="hover:bg-slate-50/60">
                      <td className="px-3 py-2.5 font-medium text-slate-900">{dev.deviceName}</td>
                      <td className="px-3 py-2.5 capitalize">{dev.deviceType}</td>
                      <td className="px-3 py-2.5">
                        <Badge tone={dev.status === 'active' ? 'success' : dev.status === 'pending' ? 'warning' : 'danger'} dot>
                          {dev.status.charAt(0).toUpperCase() + dev.status.slice(1)}
                        </Badge>
                      </td>
                      <td className="px-3 py-2.5 text-[13px] text-slate-500">
                        {dev.createdAt ? new Date(dev.createdAt).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        {dev.status !== 'revoked' && onRevokeCompanionDevice && (
                          <Button size="sm" variant="danger" onClick={() => onRevokeCompanionDevice(dev.id)}>
                            Revoke Access
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Card>

      {/* Tool Manifest Browser */}
      <Card>
        <CardHeader
          title={
            <span className="flex items-center gap-1.5">
              <Layers className="h-4 w-4 text-slate-400" /> Backend MCP Capability Browser ({filteredTools.length} / {tools.length})
            </span>
          }
          description={
            <>
              Live manifest derived dynamically from backend server endpoints (<code className="font-mono text-xs">GET /api/mcp/tools</code>).
            </>
          }
        />
        <div className="space-y-3 border-b border-slate-100 p-4 sm:px-5">
          <div className="flex items-center gap-2">
            <div className="relative w-full sm:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search tools..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`${inputClass} pl-8`}
              />
            </div>
            <Button
              size="icon"
              onClick={fetchTools}
              disabled={isLoadingTools}
              title="Refresh tools manifest"
              aria-label="Refresh tools manifest"
            >
              <RefreshCw className={`h-4 w-4 ${isLoadingTools ? 'animate-spin' : ''}`} />
            </Button>
          </div>

          {/* Domain filter chips */}
          <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 hide-scrollbar sm:mx-0 sm:flex-wrap sm:px-0">
            {domains.map((dom) => (
              <button
                key={dom}
                type="button"
                onClick={() => setSelectedDomain(dom)}
                className={`h-7 shrink-0 cursor-pointer whitespace-nowrap rounded-full border px-2.5 text-xs font-medium capitalize transition ${
                  selectedDomain === dom
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900'
                }`}
              >
                {dom === 'all' ? `All (${tools.length})` : dom}
              </button>
            ))}
          </div>
        </div>

        {/* Tool list */}
        {isLoadingTools ? (
          <div className="space-y-2 p-4 sm:p-5">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-14 animate-pulse rounded-lg bg-slate-100" />
            ))}
            <p className="sr-only">Loading backend MCP tools manifest...</p>
          </div>
        ) : toolsError ? (
          <div className="p-4 sm:p-5">
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-[13px] text-red-700">
              <AlertTriangle className="h-4 w-4 shrink-0" /> {toolsError}
            </div>
          </div>
        ) : filteredTools.length === 0 ? (
          <div className="p-4 sm:p-5">
            <EmptyState compact icon={Search} title="No tools found" description="No tools match the selected domain or query filter." />
          </div>
        ) : (
          <ul className="m-0 max-h-[640px] list-none divide-y divide-slate-100 overflow-y-auto p-0">
            {filteredTools.map((tool) => {
              const isExpanded = expandedTool === tool.name;
              return (
                <li key={tool.name} className="space-y-1.5 px-4 py-3 sm:px-5">
                  <div className="flex flex-col justify-between gap-2 md:flex-row md:items-center">
                    <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                      <code className="break-all font-mono text-[13px] font-medium text-slate-900">{tool.name}</code>
                      {getRiskBadge(tool.risk)}
                      <Badge tone="neutral" className="font-mono">scope: {tool.requiredScope}</Badge>
                      {tool.requiresConfirmation && (
                        <Badge tone="info">
                          <AlertTriangle className="h-3 w-3" /> 2-Phase Confirm
                        </Badge>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => setExpandedTool(isExpanded ? null : tool.name)}
                      className="flex h-7 shrink-0 cursor-pointer items-center gap-1 self-start rounded-md px-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 md:self-auto"
                    >
                      {isExpanded ? 'Hide Schema' : 'View Input Schema'}
                      {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    </button>
                  </div>

                  <p className="m-0 text-[13px] leading-relaxed text-slate-600">{tool.description}</p>

                  {isExpanded && tool.inputSchema && (
                    <pre className="m-0 overflow-x-auto rounded-lg border border-slate-800 bg-slate-900 p-3 font-mono text-xs leading-relaxed text-slate-100">
                      {JSON.stringify(tool.inputSchema, null, 2)}
                    </pre>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
};

export default McpIntegrationSettings;
