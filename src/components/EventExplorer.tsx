import React, { useState, useEffect } from 'react';
import {
  Search,
  Clock,
  User,
  Monitor,
  Smartphone,
  Globe,
  ChevronDown,
  ChevronUp,
  Code
} from 'lucide-react';
import { getAnalyticsEvents, RawEvent } from '@/services/eventTracking';
import {
  useReactTable,
  getCoreRowModel,
  getExpandedRowModel,
  getPaginationRowModel,
  createColumnHelper,
  ExpandedState,
} from '@tanstack/react-table';
import DataTable from './DataTable';
import { inputClass } from './ui';

const columnHelper = createColumnHelper<RawEvent>();

interface EventExplorerProps {
  selectedKeyId?: string;
}

const EventExplorer: React.FC<EventExplorerProps> = ({ selectedKeyId }) => {
  const [events, setEvents] = useState<RawEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<ExpandedState>({});
  const [searchTerm, setSearchTerm] = useState('');

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const data = await getAnalyticsEvents({
        apiKeyId: selectedKeyId,
        eventName: searchTerm || undefined,
        limit: 20
      });
      setEvents(data.events);
    } catch (err) {
      console.error('Failed to fetch events', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchEvents();
  }, [selectedKeyId, searchTerm]);

  const getDeviceIcon = (os: string = '') => {
    if (os.includes('Android') || os.includes('iOS')) return <Smartphone size={14} />;
    return <Monitor size={14} />;
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const columns = React.useMemo(() => [
    columnHelper.accessor('timestamp', {
      header: 'Timestamp',
      size: 180,
      cell: info => (
        <div className="flex items-center gap-2 text-xs font-medium text-slate-500 ">
          <Clock size={12} className="text-slate-400" />
          {formatDate(info.getValue())}
        </div>
      ),
    }),
    columnHelper.accessor('eventName', {
      header: 'Event',
      size: 150,
      cell: info => {
        const name = info.getValue();
        return (
          <span className={`rounded-md border px-2 py-0.5 text-xs font-medium ${
            name.startsWith('identify') ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-50 text-slate-700'
            }`}>
            {name.replace(/_/g, ' ')}
          </span>
        );
      },
    }),
    columnHelper.display({
      id: 'context',
      header: 'Context',
      size: 200,
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-slate-500 " title={row.original.context?.device?.os}>
            {getDeviceIcon(row.original.context?.device?.os)}
            <span className="text-xs">{row.original.context?.device?.browser || 'SDK'}</span>
          </div>
          <div className="text-slate-300">|</div>
          <div className="flex items-center gap-1.5 text-slate-500 ">
            <User size={12} className="text-slate-400" />
            <span className="max-w-[80px] truncate text-xs">{row.original.userId || 'anon'}</span>
          </div>
        </div>
      ),
    }),
    columnHelper.accessor('sessionId', {
      header: 'Session',
      size: 150,
      cell: info => (
        <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-500">
          {info.getValue().substring(0, 8)}...
        </code>
      ),
    }),
    columnHelper.display({
      id: 'properties',
      header: () => <div className="text-right">Properties</div>,
      size: 100,
      cell: ({ row }) => (
        <div className="text-right">
          <div className="inline-block p-1 text-slate-400 transition-colors group-hover:text-slate-600">
            {row.getIsExpanded() ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        </div>
      ),
    }),
  ], []);

  const table = useReactTable({
    data: events,
    columns,
    state: { expanded },
    onExpandedChange: setExpanded,
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
    getRowCanExpand: () => true,
    getRowId: (row) => row._id,
  });

  const toggleRow = (event: RawEvent) => {
    const row = table.getRowModel().rows.find(r => r.original._id === event._id);
    if (!row) return;

    const isExpanding = !row.getIsExpanded();

    // Mutual exclusivity: Close all others if we are expanding
    if (isExpanding) {
      table.toggleAllRowsExpanded(false);
    }

    row.toggleExpanded();
  };

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3.5 sm:px-5">
        <div className="min-w-0">
          <h3 className="m-0 text-[15px] font-semibold text-slate-900">Event Explorer</h3>
          <p className="m-0 mt-0.5 text-[13px] text-slate-500">
            Observation Log
          </p>
        </div>

        <div className="group relative w-full sm:w-64">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-slate-500 transition-colors">
            <Search size={16} />
          </div>
          <input
            type="text"
            className={`${inputClass} pl-10`}
            placeholder="Search event types..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <DataTable
        table={table}
        loading={loading && events.length === 0}
        onRowClick={toggleRow}
        renderExpandedRow={(event) => (
          <div className="px-3 py-4 sm:px-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
              <div className="min-w-0">
                <p className="m-0 mb-2 flex items-center gap-2 text-[13px] font-medium text-slate-700">
                  <Code size={12} />
                  Payload Properties
                </p>
                <div className="overflow-x-auto rounded-lg bg-slate-950 p-4">
                  <pre className="m-0 font-mono text-xs leading-relaxed text-slate-100 sm:text-[13px]">
                    <code>{JSON.stringify(event.properties, null, 2)}</code>
                  </pre>
                </div>
              </div>
              <div className="min-w-0">
                <p className="m-0 mb-2 flex items-center gap-2 text-[13px] font-medium text-slate-700">
                  <Globe size={12} />
                  Environment Details
                </p>
                <div className="space-y-2.5 rounded-lg border border-slate-200 bg-white p-4">
                  <div className="flex justify-between gap-3 border-b border-slate-100 pb-2">
                    <span className="text-xs text-slate-500">Library</span>
                    <span className="text-xs font-medium text-slate-900">{event.context?.library?.name} v{event.context?.library?.version}</span>
                  </div>
                  <div className="flex justify-between gap-3 border-b border-slate-100 pb-2">
                    <span className="text-xs text-slate-500">Screen</span>
                    <span className="text-xs font-medium text-slate-900">{event.context?.device?.screen || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between gap-3 border-b border-slate-100 pb-2">
                    <span className="text-xs text-slate-500">Language</span>
                    <span className="text-xs font-medium text-slate-900">{event.context?.device?.language || 'N/A'}</span>
                  </div>
                  <div className="pt-2">
                    <span className="mb-1 block text-xs text-slate-500">Page URL</span>
                    <span className="break-all text-xs text-slate-700">{event.context?.page?.url || 'N/A'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        skeletonRows={5}
        stickyHeader={true}
        className="flex-1 overflow-y-auto"
        emptyMessage="No events found"
      />
    </div>
  );
};

export default EventExplorer;
