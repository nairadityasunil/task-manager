import React, { useState } from 'react';
import { 
  Search, 
  Filter, 
  X, 
  User, 
  Activity,
  ChevronDown,
  UserCheck
} from 'lucide-react';
import { TaskStatus, TASK_WORKFLOW_STATUS_OPTIONS } from '../types/task';
import { ProjectMember } from '../types/project';
import { useAuth } from '../context/AuthContext';
import { buttonClass, cn, Field, inputClass, selectClass } from '@/components/ui';

export interface TaskFilters {
  search: string;
  status: TaskStatus | 'all';
  assigneeId: string | 'all';
}

interface TaskFilterBarProps {
  filters: TaskFilters;
  onFilterChange: (filters: TaskFilters) => void;
  members: ProjectMember[];
  onClear: () => void;
}

const TaskFilterBar: React.FC<TaskFilterBarProps> = ({
  filters,
  onFilterChange,
  members,
  onClear
}) => {
  const { user } = useAuth();
  const [isExpanded, setIsExpanded] = useState(false);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFilterChange({ ...filters, search: e.target.value });
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateFilter = (key: keyof TaskFilters, value: any) => {
    onFilterChange({ ...filters, [key]: value });
  };

  const activeFilterCount = [
    filters.status !== 'all',
    filters.assigneeId !== 'all'
  ].filter(Boolean).length;

  const assignedToMe = Boolean(user && filters.assigneeId === user.id);
  const filtersActive = activeFilterCount > 0 || isExpanded;

  return (
    <div className="py-2">
      <div className="flex flex-wrap items-center gap-2">
        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search tasks..."
            value={filters.search}
            onChange={handleSearchChange}
            className={cn(inputClass, 'pl-9 pr-9')}
          />
          {filters.search && (
            <button
              aria-label="Clear search"
              onClick={() => updateFilter('search', '')}
              className="absolute right-1.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
              type="button"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Assigned to Me Toggle */}
        {user && (
          <button
            aria-pressed={assignedToMe}
            onClick={() => updateFilter('assigneeId', filters.assigneeId === user.id ? 'all' : user.id)}
            className={buttonClass('secondary', 'md', assignedToMe ? '!border-emerald-200 !bg-emerald-50 !text-emerald-800 hover:!bg-emerald-100' : '')}
            title="Assigned to Me"
            type="button"
          >
            <UserCheck className="h-4 w-4" />
            <span>Assigned to Me</span>
          </button>
        )}

        {/* Filter Toggle */}
        <button
          aria-expanded={isExpanded}
          onClick={() => setIsExpanded(!isExpanded)}
          className={buttonClass('secondary', 'md', filtersActive ? '!border-slate-300 !bg-slate-100 !text-slate-900' : '')}
          type="button"
        >
          <Filter className="h-4 w-4" />
          <span>Filters</span>
          {activeFilterCount > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-600 px-1 text-[11px] font-medium text-white">
              {activeFilterCount}
            </span>
          )}
          <ChevronDown className={cn('h-4 w-4 text-slate-400 transition-transform duration-200', isExpanded && 'rotate-180')} />
        </button>

        {activeFilterCount > 0 && (
          <button
            onClick={onClear}
            className={buttonClass('ghost', 'md', 'hover:!text-red-600')}
            type="button"
          >
            Clear All
          </button>
        )}
      </div>

      {/* Expanded Filters */}
      {isExpanded && (
        <div className="mt-3 grid grid-cols-1 gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 sm:grid-cols-2">
          {/* Status */}
          <Field label={<span className="inline-flex items-center gap-1.5"><Activity className="h-3.5 w-3.5 text-slate-400" /> Status</span>}>
            <select
              value={filters.status}
              onChange={(e) => updateFilter('status', e.target.value)}
              className={selectClass}
            >
              <option value="all">All Statuses</option>
              {[...TASK_WORKFLOW_STATUS_OPTIONS, { value: 'rolled_over', label: 'Rolled Over' }].map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </Field>

          {/* Assignee */}
          <Field label={<span className="inline-flex items-center gap-1.5"><User className="h-3.5 w-3.5 text-slate-400" /> Assigned to</span>}>
            <select
              value={filters.assigneeId}
              onChange={(e) => updateFilter('assigneeId', e.target.value)}
              className={selectClass}
            >
              <option value="all">All Members</option>
              {members.map(member => (
                <option key={member.id} value={member.userId}>{member.user.name || member.user.email}</option>
              ))}
            </select>
          </Field>
        </div>
      )}
    </div>
  );
};

export default TaskFilterBar;
