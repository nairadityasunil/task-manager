import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  Trash2,
  Copy,
  Check,
  RefreshCw,
  ChevronDown,
  Loader2,
  Filter,
  BookOpen,
  AlertTriangle,
  X
} from 'lucide-react';
import {
  listApiKeys,
  createApiKey,
  deleteApiKey,
  AnalyticsKey,
  getAnalyticsEvents,
  getEventLogs,
  getTrackedEvents,
  RawEvent,
  EventLog,
  TrackedEvent
} from '@/services/eventTracking';
import Modal from '@/components/Modal';
import { useConfirm } from '@/context/ConfirmationContext';
import { Activity } from 'lucide-react';
import {
  useReactTable,
  getCoreRowModel,
  getExpandedRowModel,
  createColumnHelper,
  ExpandedState,
} from '@tanstack/react-table';

import DataTable from '@/components/DataTable';
import PageHeader from '@/components/PageHeader';
import { Badge, Button, Field, inputClass } from '@/components/ui';

const columnHelper = createColumnHelper<RawEvent>();

const columns = [
  columnHelper.accessor('userId', {
    header: 'User',
    size: 200,
    cell: info => {
      const value = info.getValue() || '-';
      return (
        <div className="flex min-w-0 items-center gap-1">
          <span className="truncate font-mono text-xs text-slate-700">
            {value}
          </span>
        </div>
      );
    },
  }),
  columnHelper.accessor('eventName', {
    header: 'Event',
    size: 200,
    cell: info => {
      const name = info.getValue();
      const getEventStyle = (name: string) => {
        const lowerName = name.toLowerCase();
        if (lowerName.includes('identify')) return 'text-emerald-700 bg-emerald-50 border-emerald-200';
        if (lowerName.includes('error') || lowerName.includes('fail')) return 'text-red-700 bg-red-50 border-red-200';
        return 'text-slate-700 bg-slate-50 border-slate-200';
      };

      return (
        <span className={`inline-block max-w-full truncate rounded-md border px-2 py-0.5 text-xs font-medium ${getEventStyle(name)}`}>
          {name.replace(/_/g, ' ')}
        </span>
      );
    },
  }),
  columnHelper.accessor('timestamp', {
    id: 'date',
    header: 'Date',
    size: 140,
    meta: { className: 'hidden sm:table-cell' },
    cell: info => (
      <div className="font-mono text-xs text-slate-500">
        {new Date(info.getValue()).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '.')}
      </div>
    ),
  }),
  columnHelper.accessor('timestamp', {
    id: 'time',
    header: 'Time',
    size: 100,
    cell: info => (
      <div className="font-mono text-xs text-slate-800">
        {new Date(info.getValue()).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
      </div>
    ),
  }),
  columnHelper.display({
    id: 'expander',
    header: '',
    size: 40,
    cell: ({ row }) => {
      const isExpanded = row.getIsExpanded();
      return (
        <div className="flex justify-end">
          <div className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
            <ChevronDown
              size={16}
              className={`transition-colors duration-200 ${isExpanded ? 'text-slate-700' : 'text-slate-400'}`}
            />
          </div>
        </div>
      );
    },
  }),
];

const MultiSelect = ({
  options,
  selected,
  onChange,
  placeholder = "Select events..."
}: {
  options: string[],
  selected: string[],
  onChange: (selected: string[]) => void,
  placeholder?: string
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const remainingOptions = options.filter(opt => !selected.includes(opt));

  return (
    <div className="relative">
      <div
        className="flex min-h-9 cursor-pointer flex-wrap items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-1.5 py-1 shadow-sm transition-colors hover:border-slate-400"
        onClick={() => setIsOpen(!isOpen)}
      >
        {selected.length === 0 && (
          <span className="px-1.5 text-sm text-slate-400">{placeholder}</span>
        )}
        {selected.map(item => (
          <span key={item} className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 py-0.5 pl-2 pr-1 text-xs font-medium text-slate-700">
            {item.replace(/_/g, ' ')}
            <X
              size={14}
              className="cursor-pointer text-slate-400 transition-colors hover:text-red-600"
              onClick={(e) => {
                e.stopPropagation();
                onChange(selected.filter(i => i !== item));
              }}
            />
          </span>
        ))}
      </div>

      {isOpen && remainingOptions.length > 0 && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-[220px] overflow-y-auto rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
            {remainingOptions.map(opt => (
              <div
                key={opt}
                className="cursor-pointer rounded-md px-3 py-2 text-[13px] text-slate-700 transition-colors hover:bg-slate-50"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange([...selected, opt]);
                  setIsOpen(false);
                }}
              >
                {opt.replace(/_/g, ' ')}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

interface EventTrackingPageProps {
  onOpenDocs?: () => void;
  sdkIntegrationId?: string;
  hideHeader?: boolean;
}

const formatCount = (value: number): string => new Intl.NumberFormat(undefined, { notation: value >= 10000 ? 'compact' : 'standard' }).format(value);

/** Totals and the most frequent events, which double as one-click filters. */
function EventSummaryBar({
  availableEvents,
  activeEventNames,
  filterCount,
  refreshing,
  showControls,
  onToggleEvent,
  onOpenFilters,
  onRefresh
}: {
  availableEvents: TrackedEvent[];
  activeEventNames: string[];
  filterCount: number;
  refreshing: boolean;
  showControls: boolean;
  onToggleEvent: (eventName: string) => void;
  onOpenFilters: () => void;
  onRefresh: () => void;
}): JSX.Element {
  const total = availableEvents.reduce((sum, event) => sum + (event.count ?? 0), 0);
  const top = [...availableEvents].sort((a, b) => (b.count ?? 0) - (a.count ?? 0)).slice(0, 6);
  const max = Math.max(...top.map((event) => event.count ?? 0), 1);

  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-3 border-b border-slate-200 bg-white px-4 py-4 sm:px-5">
      <div className="flex gap-6">
        <div>
          <p className="m-0 text-[13px] text-slate-500">Events recorded</p>
          <p className="m-0 mt-0.5 text-xl font-semibold tracking-tight tabular-nums text-slate-900">{formatCount(total)}</p>
        </div>
        <div>
          <p className="m-0 text-[13px] text-slate-500">Event types</p>
          <p className="m-0 mt-0.5 text-xl font-semibold tracking-tight tabular-nums text-slate-900">{formatCount(availableEvents.length)}</p>
        </div>
      </div>
      {top.length > 0 && (
        <div className="flex min-w-0 flex-1 basis-full flex-wrap items-center gap-1.5 md:basis-0" aria-label="Most frequent events">
          {top.map((event) => {
            const active = activeEventNames.includes(event.eventName);
            return (
              <button
                aria-pressed={active}
                className={`relative h-8 max-w-full overflow-hidden rounded-lg border px-2.5 font-mono text-xs transition-colors ${
                  active ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                }`}
                key={event.id}
                onClick={() => onToggleEvent(event.eventName)}
                title={`Show only ${event.eventName}`}
                type="button"
              >
                {!active && (
                  <span aria-hidden className="absolute inset-y-0 left-0 bg-slate-100" style={{ width: `${((event.count ?? 0) / max) * 100}%` }} />
                )}
                <span className="relative block truncate">
                  {event.eventName}
                  <span className={`ml-1.5 tabular-nums ${active ? 'text-slate-300' : 'text-slate-400'}`}>{formatCount(event.count ?? 0)}</span>
                </span>
              </button>
            );
          })}
        </div>
      )}
      {showControls && (
        <div className="ml-auto flex items-center gap-2">
          <Button icon={Filter} onClick={onOpenFilters}>
            Filters
            {filterCount > 0 && <span className="rounded-full bg-slate-900 px-1.5 text-[11px] font-medium text-white">{filterCount}</span>}
          </Button>
          <button
            aria-label="Refresh events"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm hover:text-slate-800 disabled:opacity-40"
            disabled={refreshing}
            onClick={onRefresh}
            title="Refresh"
            type="button"
          >
            <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
          </button>
        </div>
      )}
    </div>
  );
}

const EventTrackingPage: React.FC<EventTrackingPageProps> = ({ onOpenDocs, sdkIntegrationId, hideHeader = false }) => {
  const confirm = useConfirm();
  const [keys, setKeys] = useState<AnalyticsKey[]>([]);
  const [selectedKeyId, setSelectedKeyId] = useState<string>('');
  const [rawLogs, setRawLogs] = useState<RawEvent[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(30);
  const [totalPages, setTotalPages] = useState(1);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // UI states
  const [isNodeSwitcherOpen, setIsNodeSwitcherOpen] = useState(false);
  const [isManageKeysModalOpen, setIsManageKeysModalOpen] = useState(false);
  const [isCreateKeyModalOpen, setIsCreateKeyModalOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<AnalyticsKey | null>(null);
  const [expanded, setExpanded] = useState<ExpandedState>({});
  const [logDetails, setLogDetails] = useState<Record<string, EventLog>>({});
  const [fetchingPayloadId, setFetchingPayloadId] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);
  const [isFiltersModalOpen, setIsFiltersModalOpen] = useState(false);
  const [availableEvents, setAvailableEvents] = useState<TrackedEvent[]>([]);
  const [draftFilters, setDraftFilters] = useState({
    eventNames: [] as string[],
    startDate: '',
    endDate: ''
  });
  const [appliedFilters, setAppliedFilters] = useState({
    eventNames: [] as string[],
    startDate: '',
    endDate: ''
  });

  const loadInitialData = async () => {
    if (sdkIntegrationId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const apiKeys = await listApiKeys();
      setKeys(apiKeys);
      if (apiKeys.length > 0) {
        setSelectedKeyId(apiKeys[0].id);
      }
    } catch (err) {
      console.error('Failed to load API keys', err);
    } finally {
      setLoading(false);
    }
  };

  const loadLogs = async (keyId: string, page: number) => {
    setRefreshing(true);
    try {
      const queryParams: Record<string, unknown> = {
        page,
        limit: pageSize,
        // Comma-separated: Express 5's query parser does not turn eventNames[]=a into an array.
        eventNames: appliedFilters.eventNames.length > 0 ? appliedFilters.eventNames.join(',') : undefined,
        startDate: appliedFilters.startDate || undefined,
        endDate: appliedFilters.endDate || undefined
      };
      if (sdkIntegrationId) {
        queryParams.sdkIntegrationId = sdkIntegrationId;
      } else {
        queryParams.apiKeyId = keyId;
      }
      const data = await getAnalyticsEvents(queryParams);
      setRawLogs(data.events || []);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      console.error('Failed to load logs', err);
    } finally {
      setRefreshing(false);
    }
  };

  const loadAvailableEvents = async (keyId: string) => {
    if (!keyId && !sdkIntegrationId) return;
    try {
      const data = await getTrackedEvents(
        sdkIntegrationId || keyId,
        {},
        !!sdkIntegrationId
      );
      setAvailableEvents(data);
    } catch (err) {
      console.error('Failed to load available events', err);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, [sdkIntegrationId]);

  // Event names (with totals) only depend on the source, not on filters.
  useEffect(() => {
    if (sdkIntegrationId || selectedKeyId) {
      void loadAvailableEvents(selectedKeyId);
    }
  }, [selectedKeyId, sdkIntegrationId]);

  // One fetch per change: filter and source changes reset the page in the
  // same update (see applyFilters / selectKey), so they never double-fetch.
  useEffect(() => {
    if (sdkIntegrationId || selectedKeyId) {
      void loadLogs(selectedKeyId, currentPage);
    }
  }, [currentPage, sdkIntegrationId, selectedKeyId, appliedFilters]);

  const applyFilters = (filters: typeof appliedFilters) => {
    setAppliedFilters(filters);
    setCurrentPage(1);
  };

  const selectKey = (id: string) => {
    setSelectedKeyId(id);
    setCurrentPage(1);
  };

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) return;
    try {
      const newKey = await createApiKey(newKeyName);
      setNewlyCreatedKey(newKey);
      setIsCreateKeyModalOpen(false);
      setNewKeyName('');
      const updatedKeys = await listApiKeys();
      setKeys(updatedKeys);
      if (!selectedKeyId) selectKey(newKey.id);
    } catch (err) {
      console.error('Failed to create API key', err);
    }
  };

  const handleDeleteKey = async (id: string, name: string) => {
    const isConfirmed = await confirm({
      title: 'Delete Telemetry Node',
      message: `Are you sure you want to delete the API key "${name}"? This action is irreversible and all events tracked with this key will no longer be visible.`,
      confirmText: 'Delete Node',
      type: 'danger'
    });

    if (!isConfirmed) return;

    try {
      await deleteApiKey(id);
      const updatedKeys = await listApiKeys();
      setKeys(updatedKeys);
      if (selectedKeyId === id) {
        selectKey(updatedKeys[0]?.id || '');
      }
    } catch (err) {
      console.error('Failed to delete API key', err);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const activeKey = useMemo(() => {
    return keys.find(k => k.id === selectedKeyId);
  }, [keys, selectedKeyId]);

  const table = useReactTable({
    data: rawLogs,
    columns,
    state: { expanded },
    onExpandedChange: setExpanded,
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getRowCanExpand: () => true,
    getRowId: (row) => row._id,
  });

  const toggleRow = async (event: RawEvent) => {
    const row = table.getRow(event._id);
    if (!row) return;

    const isExpanding = !row.getIsExpanded();

    // Mutual exclusivity: Close all others if we are expanding
    if (isExpanding) {
      table.toggleAllRowsExpanded(false);
    }

    row.toggleExpanded();

    if (isExpanding && !logDetails[event._id] && (sdkIntegrationId || selectedKeyId)) {
      setFetchingPayloadId(event._id);
      try {
        const logs = await getEventLogs(event._id, sdkIntegrationId || selectedKeyId, !!sdkIntegrationId);
        if (logs && logs.length > 0) {
          setLogDetails(prev => ({ ...prev, [event._id]: logs[0] }));
        }
      } catch (err) {
        console.error('Failed to fetch payload details', err);
      } finally {
        setFetchingPayloadId(null);
      }
    }
  };

  const filterCount = appliedFilters.eventNames.length + (appliedFilters.startDate ? 1 : 0) + (appliedFilters.endDate ? 1 : 0);

  const summaryBar = (sdkIntegrationId || selectedKeyId) ? (
    <EventSummaryBar
      activeEventNames={appliedFilters.eventNames}
      availableEvents={availableEvents}
      filterCount={filterCount}
      onOpenFilters={() => {
        setDraftFilters(appliedFilters);
        setIsFiltersModalOpen(true);
      }}
      onRefresh={() => void loadLogs(selectedKeyId, currentPage)}
      onToggleEvent={(eventName) =>
        applyFilters({
          ...appliedFilters,
          eventNames: appliedFilters.eventNames.length === 1 && appliedFilters.eventNames[0] === eventName ? [] : [eventName]
        })
      }
      refreshing={refreshing}
      showControls={hideHeader}
    />
  ) : null;

  const content = (!selectedKeyId && !sdkIntegrationId) ? (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center sm:py-16">
      <span className="flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-500">
        <Activity size={20} />
      </span>
      <h3 className="m-0 mt-4 text-[15px] font-semibold text-slate-900">
        Telemetry Node Required
      </h3>
      <p className="m-0 mx-auto mt-1 max-w-[420px] text-sm text-slate-500">
        Start monitoring your synchronization ecosystem. Select a telemetry node from the dashboard above to explore incoming interaction signals in real-time.
      </p>
      <Button className="mt-5" icon={Plus} onClick={() => setIsNodeSwitcherOpen(true)} variant="primary">
        Provision Tracking Node
      </Button>
    </div>
  ) : (
    <DataTable
      table={table}
      loading={refreshing || (loading && rawLogs.length === 0)}
      onRowClick={toggleRow}
      stickyHeader={true}
      tableClassName="border-separate border-spacing-y-0"
      renderExpandedRow={(event) => {
        const details = logDetails[event._id];
        const isFetching = fetchingPayloadId === event._id;

        return (
          <div className="px-2 pb-4 pt-1 sm:px-4">
            <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2 sm:px-4">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="truncate font-mono text-[13px] font-medium text-slate-900">{event.eventName}</span>
                  <Badge>Raw log data</Badge>
                </div>
                <span className="text-xs text-slate-500">{new Date(event.timestamp).toLocaleString()}</span>
              </div>

              {isFetching ? (
                <div className="flex items-center justify-center gap-2 py-10 text-[13px] text-slate-500">
                  <Loader2 size={16} className="animate-spin" />
                  <span>Syncing Payload...</span>
                </div>
              ) : (
                <pre className="custom-scrollbar m-0 max-h-[500px] overflow-auto bg-slate-950 p-4 font-mono text-xs leading-relaxed text-slate-100 sm:text-[13px]">
                  <code>{JSON.stringify(event.payload || details?.payload || {}, null, 2)}</code>
                </pre>
              )}
            </div>
          </div>
        );
      }}
      skeletonRows={10}
      className={hideHeader ? '' : 'flex-none'}
      pagination={{
        page: currentPage,
        totalPages: totalPages || 1,
        onPageChange: setCurrentPage
      }}
      emptyMessage="No event logs match current filters"
    />
  );

  return (
    <div className={hideHeader ? 'flex flex-col bg-white' : 'flex min-h-full flex-col bg-slate-50'}>
      {!hideHeader && (
        <PageHeader
          title="Event Tracking"
          description="Telemetry Stream Monitoring"
          icon={Activity}
          actions={
            <>
              {/* Optimized Node Switcher */}
              {!sdkIntegrationId && (
                <div className="relative">
                  <button
                    onClick={() => setIsNodeSwitcherOpen(!isNodeSwitcherOpen)}
                    className="flex h-9 min-w-[160px] max-w-[220px] items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 shadow-sm transition-colors hover:bg-slate-50"
                    type="button"
                  >
                    <span className="truncate">{activeKey ? activeKey.name : 'Select Node'}</span>
                    <ChevronDown size={14} className="shrink-0 text-slate-400" />
                  </button>

                  {isNodeSwitcherOpen && (
                    <div className="absolute left-0 top-full z-50 mt-1 w-[240px] max-w-[calc(100vw-32px)] rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
                      {keys.length === 0 && <p className="m-0 px-3 py-2 text-[13px] text-slate-500">No nodes yet.</p>}
                      {keys.map(key => (
                        <button
                          key={key.id}
                          onClick={() => { selectKey(key.id); setIsNodeSwitcherOpen(false); }}
                          className={`flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors ${selectedKeyId === key.id ? 'bg-slate-100 font-medium text-slate-900' : 'text-slate-700 hover:bg-slate-50'}`}
                          type="button"
                        >
                          <span className="truncate">{key.name}</span>
                          {selectedKeyId === key.id && <Check size={14} className="shrink-0" />}
                        </button>
                      ))}
                      <div className="my-1 border-t border-slate-100" />
                      <button
                        onClick={() => { setIsManageKeysModalOpen(true); setIsNodeSwitcherOpen(false); }}
                        className="w-full rounded-md px-3 py-2 text-left text-[13px] font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
                        type="button"
                      >
                        Manage Nodes
                      </button>
                    </div>
                  )}
                  {isNodeSwitcherOpen && <div className="fixed inset-0 z-40" onClick={() => setIsNodeSwitcherOpen(false)} />}
                </div>
              )}

              <Button icon={BookOpen} onClick={() => onOpenDocs?.()}>
                SDK Documentation
              </Button>

              <Button
                icon={Filter}
                onClick={() => {
                  setDraftFilters(appliedFilters);
                  setIsFiltersModalOpen(true);
                }}
              >
                Filters
                {filterCount > 0 ? (
                  <span className="rounded-full bg-slate-900 px-1.5 py-0.5 text-[11px] font-medium text-white">
                    {filterCount}
                  </span>
                ) : null}
              </Button>

              <Button
                aria-label="Refresh events"
                onClick={() => { loadLogs(selectedKeyId, currentPage); }}
                disabled={refreshing || (!selectedKeyId && !sdkIntegrationId)}
                size="icon"
                title="Refresh"
              >
                <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
              </Button>
            </>
          }
        />
      )}

      {hideHeader ? (
        <>
          {summaryBar}
          <div className="flex min-w-0 flex-col">{content}</div>
        </>
      ) : (
        <div className="px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
          {summaryBar ? (
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              {summaryBar}
              {content}
            </div>
          ) : content}
        </div>
      )}

      {/* --- MODALS --- */}
      {isFiltersModalOpen && (
        <Modal
          title="Filter Event Logs"
          onClose={() => {
            setDraftFilters(appliedFilters);
            setIsFiltersModalOpen(false);
          }}
          maxWidth="max-w-[520px]"
        >
          <div className="grid gap-5">
            <div className="grid gap-1.5">
              <span className="text-sm font-medium text-slate-700">
                Events
              </span>
              <MultiSelect
                options={availableEvents.map(e => e.eventName)}
                selected={draftFilters.eventNames}
                onChange={(eventNames) => setDraftFilters(prev => ({ ...prev, eventNames }))}
                placeholder="Choose events to monitor..."
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Start date">
                <input
                  className={inputClass}
                  onChange={(event) => setDraftFilters((current) => ({ ...current, startDate: event.target.value }))}
                  type="date"
                  value={draftFilters.startDate}
                />
              </Field>
              <Field label="End date">
                <input
                  className={inputClass}
                  onChange={(event) => setDraftFilters((current) => ({ ...current, endDate: event.target.value }))}
                  type="date"
                  value={draftFilters.endDate}
                />
              </Field>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-4">
              <Button
                variant="ghost"
                onClick={() => {
                  setDraftFilters({ eventNames: [], startDate: '', endDate: '' });
                  applyFilters({ eventNames: [], startDate: '', endDate: '' });
                  setCurrentPage(1);
                  setIsFiltersModalOpen(false);
                }}
              >
                Reset
              </Button>
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => {
                    setDraftFilters(appliedFilters);
                    setIsFiltersModalOpen(false);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={() => {
                    applyFilters(draftFilters);
                    setCurrentPage(1);
                    setIsFiltersModalOpen(false);
                  }}
                >
                  Apply
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      )}
      {isManageKeysModalOpen && (
        <Modal
          title="Node Management"
          onClose={() => setIsManageKeysModalOpen(false)}
          maxWidth="max-w-[480px]"
        >
          <div className="grid gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 sm:p-4">
              <div className="min-w-0">
                <h4 className="m-0 text-sm font-medium text-slate-900">Provision New Node</h4>
                <p className="m-0 mt-0.5 text-[13px] text-slate-500">Add identifiers for fresh telemetry streams.</p>
              </div>
              <Button icon={Plus} onClick={() => setIsCreateKeyModalOpen(true)} variant="primary">
                New Node
              </Button>
            </div>

            <div className="grid max-h-[300px] gap-2 overflow-y-auto">
              {keys.length === 0 && <p className="m-0 py-4 text-center text-[13px] text-slate-500">No nodes yet.</p>}
              {keys.map(key => (
                <div
                  key={key.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium text-slate-900">{key.name}</span>
                      <Badge dot tone="success">Active</Badge>
                    </div>
                    <code className="mt-0.5 block truncate font-mono text-xs text-slate-500">{key.maskedKey}</code>
                  </div>
                  <button
                    aria-label={`Delete ${key.name}`}
                    onClick={(e) => { e.stopPropagation(); handleDeleteKey(key.id, key.name); }}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600"
                    type="button"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </Modal>
      )}

      {isCreateKeyModalOpen && (
        <Modal
          title="Create API Key"
          onClose={() => setIsCreateKeyModalOpen(false)}
          maxWidth="max-w-[400px]"
        >
          <form onSubmit={handleCreateKey} className="grid gap-5">
            <Field label="Node name">
              <input
                autoFocus
                type="text"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                placeholder="e.g. Production Client"
                className={inputClass}
              />
            </Field>
            <div className="flex justify-end gap-2">
              <Button onClick={() => setIsCreateKeyModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={!newKeyName.trim()} variant="primary">
                Create
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {newlyCreatedKey && (
        <Modal
          title="Node Key Created"
          onClose={() => setNewlyCreatedKey(null)}
          maxWidth="max-w-[400px]"
        >
          <div className="grid gap-4">
            <div className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-[13px] text-amber-800">
              <AlertTriangle size={15} className="mt-0.5 shrink-0" />
              <span>Warning: This is the only time this key will be displayed.</span>
            </div>
            <div className="grid gap-1.5">
              <span className="text-sm font-medium text-slate-700">Secret API key</span>
              <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 py-1 pl-3 pr-1">
                <code className="min-w-0 flex-1 break-all py-1 font-mono text-[13px] text-slate-800">{newlyCreatedKey.key}</code>
                <button
                  aria-label="Copy key"
                  onClick={() => copyToClipboard(newlyCreatedKey.key || '')}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
                  type="button"
                >
                  {copiedKey ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
                </button>
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={() => setNewlyCreatedKey(null)} variant="primary">
                Done
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default EventTrackingPage;