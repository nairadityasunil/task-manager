import { Bot, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import EmptyState from '@/components/EmptyState';
import { Badge, Button, Card, CardHeader } from '@/components/ui';
import { useConfirm } from '@/context/ConfirmationContext';
import { useToast } from '@/context/ToastContext';
import { agentsApi, type Agent } from '@/services/agents';
import { toDisplayErrorMessage } from '@/utils/apiError';

const when = (iso?: string | null): string => (iso ? new Date(iso).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : 'Never');

/**
 * The AI tools that connect to your workspace through MCP (Claude Desktop, Cursor, ...): each one that has connected is
 * listed here. This is not the list of paired devices (phones, tablets and apps); those are under Companion Devices.
 */
export function McpClientsCard(): JSX.Element {
  const { showToast } = useToast();
  const confirm = useConfirm();
  const [clients, setClients] = useState<Agent[] | null>(null);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setClients(await agentsApi.list({ kind: 'mcp_client' }));
      setError(false);
    } catch {
      setError(true);
      setClients([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const disconnect = async (client: Agent): Promise<void> => {
    const sure = await confirm({
      title: `Disconnect ${client.clientName || client.name}?`,
      message: 'It loses access through MCP at once. It can connect again only with a new sign-in or key.',
      confirmText: 'Disconnect',
      type: 'danger'
    });
    if (!sure) return;
    setBusy(client.id);
    try {
      await agentsApi.revoke(client.id, 'Disconnected from MCP settings');
      showToast({ variant: 'success', message: `${client.clientName || client.name} was disconnected.` });
      await load();
    } catch (err) {
      showToast({ variant: 'error', message: toDisplayErrorMessage(err) });
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card data-testid="mcp-clients">
      <CardHeader
        description="AI tools that have connected to your workspace through MCP. Paired phones, tablets and apps are separate: see Companion Devices."
        icon={<Bot className="h-4 w-4 text-slate-400" />}
        title="Connected MCP clients"
      />
      <div className="p-4">
        {clients === null ? (
          <div className="flex items-center justify-center gap-2 p-6 text-[13px] text-slate-500">
            <RefreshCw className="h-4 w-4 animate-spin" /> Loading MCP clients…
          </div>
        ) : clients.length === 0 ? (
          <EmptyState
            compact
            description={error ? 'Could not load the list. Try again in a moment.' : 'Add your Sync API key to Claude Desktop, Cursor or any MCP client. It shows up here once it connects.'}
            icon={Bot}
            title="No MCP client has connected yet."
          />
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full min-w-[560px] text-left text-sm" data-testid="mcp-clients-table">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  <th className="px-3 py-2.5 font-medium">Client</th>
                  <th className="px-3 py-2.5 font-medium">Status</th>
                  <th className="px-3 py-2.5 font-medium">Last active</th>
                  <th className="px-3 py-2.5 text-right font-medium">Calls</th>
                  <th className="px-3 py-2.5 text-right font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {clients.map((c) => (
                  <tr className="hover:bg-slate-50/60" data-testid="mcp-client-row" key={c.id}>
                    <td className="px-3 py-2.5 font-medium text-slate-900">{c.clientName || c.name}</td>
                    <td className="px-3 py-2.5">
                      <Badge dot tone={c.status === 'active' ? 'success' : 'warning'}>
                        {c.status.charAt(0).toUpperCase() + c.status.slice(1)}
                      </Badge>
                    </td>
                    <td className="px-3 py-2.5 text-[13px] text-slate-500">{when(c.lastSeenAt)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{c.callCount}</td>
                    <td className="px-3 py-2.5 text-right">
                      <Button data-testid="mcp-client-disconnect" disabled={busy === c.id} onClick={() => void disconnect(c)} size="sm" variant="danger">
                        Disconnect
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="m-0 mt-3 text-xs text-slate-500">
          API keys for agents are managed in{' '}
          <Link className="font-medium text-slate-700 underline" to="/agents">
            Agent Governance
          </Link>
          .
        </p>
      </div>
    </Card>
  );
}

export default McpClientsCard;
