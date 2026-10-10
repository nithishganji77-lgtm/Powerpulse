import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';
import { useMaintenanceList } from '@/hooks/useWorkflows';
import { useAssignableUsers } from '@/hooks/useAdmin';
import { useUrlState } from '@/hooks/useUrlState';
import { useDebouncedUrlParam } from '@/hooks/useDebouncedUrlParam';
import { useFocusParam, usePageParams, useServerSort } from '@/hooks/useListUrlParams';
import { useAuth } from '@/context/AuthContext';
import type { MaintenanceDto, MaintenanceListParams, MaintenanceStatus, Priority } from '@/types/api';
import { PageHeader } from '@/components/layout/PageHeader';
import { RoleGate } from '@/components/layout/RoleGate';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { Pagination } from '@/components/ui/Pagination';
import { Panel } from '@/components/ui/Panel';
import { Select } from '@/components/ui/Select';
import { LoadingBlock } from '@/components/ui/Skeleton';
import { MaintenanceStatusBadge, OverdueBadge, PriorityBadge } from '@/components/ui/StatusBadges';
import { Table, type Column } from '@/components/ui/Table';
import { Tabs } from '@/components/ui/Tabs';
import { MaintenanceDetailDrawer } from '@/components/maintenance/MaintenanceDetailDrawer';
import { NewMaintenanceTaskDialog } from '@/components/maintenance/NewMaintenanceTaskDialog';
import { ClearFiltersButton, EnumFilter, TransformerFilter } from '@/components/workflow/FilterControls';
import { formatDateTime } from '@/utils/format';
import { MAINTENANCE_STATUSES, maintenanceStatusLabel, PRIORITIES, priorityLabel } from '@/utils/labels';
import { links } from '@/utils/links';

type TabId = 'all' | 'overdue' | 'upcoming';
const TABS: TabId[] = ['all', 'overdue', 'upcoming'];
const DEFAULT_SORT = 'dueDate,asc';
const SORT_FIELDS: Record<string, string> = { due: 'dueDate', priority: 'priority', status: 'status', created: 'createdAt' };
const FILTER_KEYS = ['q', 'status', 'priority', 'technicianId', 'transformerId'];

export default function MaintenancePage() {
  const { user } = useAuth();
  const isTechnician = user?.role === 'TECHNICIAN';
  const { get, set } = useUrlState();
  const [q, setQ] = useDebouncedUrlParam('q');
  const { page, size, setPage, setSize } = usePageParams();
  const { sort, tableSort, onSortChange } = useServerSort(DEFAULT_SORT, SORT_FIELDS);
  const { focus, open, close } = useFocusParam();
  const [newOpen, setNewOpen] = useState(false);
  const technicians = useAssignableUsers('TECHNICIAN', !isTechnician && !!user);

  const tabParam = get('tab') as TabId | undefined;
  const tab: TabId = tabParam && TABS.includes(tabParam) ? tabParam : 'all';
  const status = get('status') as MaintenanceStatus | undefined;
  const priority = get('priority') as Priority | undefined;

  const params = useMemo<MaintenanceListParams>(() => {
    const p: MaintenanceListParams = { page, size, sort };
    const qv = get('q');
    if (qv) p.q = qv;
    if (status && MAINTENANCE_STATUSES.includes(status)) p.status = status;
    if (priority && PRIORITIES.includes(priority)) p.priority = priority;
    const tech = get('technicianId');
    if (tech && !isTechnician) p.technicianId = tech;
    const tid = get('transformerId');
    if (tid) p.transformerId = tid;
    if (tab === 'overdue') p.overdue = true;
    if (tab === 'upcoming') p.upcoming = true;
    return p;
  }, [get, page, size, sort, status, priority, tab, isTechnician]);

  const list = useMaintenanceList(params);
  const setFilter = (key: string) => (v: string) => set({ [key]: v }, { resetPage: true });
  const hasFilters = FILTER_KEYS.some((k) => get(k));
  const clearFilters = () => set(Object.fromEntries(FILTER_KEYS.map((k) => [k, undefined])), { resetPage: true });

  const columns: Column<MaintenanceDto>[] = [
    {
      key: 'title',
      header: 'Task',
      rowHeader: true,
      cell: (t) => <span className="block max-w-[18rem] truncate">{t.title}</span>,
    },
    {
      key: 'transformer',
      header: 'Transformer',
      cell: (t) => (
        <span className="flex flex-col">
          <Link to={links.transformer(t.transformerId)} className="font-mono text-xs text-accent-ink hover:underline">
            {t.transformerCode}
          </Link>
          <span className="text-[0.7rem] text-fg-muted">{t.location}</span>
        </span>
      ),
    },
    { key: 'priority', header: 'Priority', sortable: true, cell: (t) => <PriorityBadge value={t.priority} /> },
    { key: 'status', header: 'Status', sortable: true, cell: (t) => <MaintenanceStatusBadge value={t.status} /> },
    {
      key: 'due',
      header: 'Due',
      sortable: true,
      cell: (t) => (
        <span className="inline-flex items-center gap-1.5">
          <span className="font-mono text-xs">{formatDateTime(t.dueDate)}</span>
          {t.overdue && t.status !== 'COMPLETED' && t.status !== 'CANCELLED' && <OverdueBadge />}
        </span>
      ),
    },
    { key: 'technician', header: 'Technician', cell: (t) => t.assignedTechnicianName ?? <span className="text-fg-muted">Unassigned</span> },
    {
      key: 'alert',
      header: 'Alert',
      cell: (t) =>
        t.alertId ? (
          <Link to={links.alert(t.alertId)} className="font-mono text-xs text-accent-ink hover:underline">
            View alert
          </Link>
        ) : (
          <span className="text-fg-muted">—</span>
        ),
    },
    { key: 'created', header: 'Created', sortable: true, cell: (t) => <span className="font-mono text-xs text-fg-muted">{formatDateTime(t.createdAt)}</span> },
  ];

  const tabLabel: Record<TabId, string> = { all: 'All', overdue: 'Overdue', upcoming: 'Upcoming' };

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        eyebrow="Operations"
        title={isTechnician ? 'My tasks' : 'Maintenance'}
        description={
          isTechnician
            ? 'Maintenance tasks assigned to you. Start work, record findings and parts, then complete.'
            : 'Inspection and repair tasks across the network.'
        }
        actions={
          <RoleGate roles={['ADMIN', 'ENGINEER']}>
            <Button variant="primary" icon={<Plus />} onClick={() => setNewOpen(true)}>
              New task
            </Button>
          </RoleGate>
        }
      />

      <Panel bodyClassName="grid grid-cols-2 gap-3 p-3 md:grid-cols-4 xl:grid-cols-6">
        <Field label="Search" className="col-span-2">
          <Input type="search" leading={<Search />} placeholder="Title or transformer" value={q} onChange={(e) => setQ(e.target.value)} />
        </Field>
        <EnumFilter label="Status" value={params.status ?? ''} onChange={setFilter('status')} options={MAINTENANCE_STATUSES} labels={maintenanceStatusLabel} />
        <EnumFilter label="Priority" value={params.priority ?? ''} onChange={setFilter('priority')} options={PRIORITIES} labels={priorityLabel} />
        {!isTechnician && (
          <Field label="Technician" hint={technicians.isError ? 'Could not load technicians.' : undefined}>
            <Select value={get('technicianId') ?? ''} onChange={(e) => setFilter('technicianId')(e.target.value)}>
              <option value="">All</option>
              {(technicians.data ?? []).map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </Select>
          </Field>
        )}
        <TransformerFilter value={get('transformerId') ?? ''} onChange={setFilter('transformerId')} />
        {hasFilters && (
          <div className="col-span-2 flex items-end">
            <ClearFiltersButton onClick={clearFilters} />
          </div>
        )}
      </Panel>

      <Tabs
        label="Task views"
        tabs={TABS.map((id) => ({ id, label: tabLabel[id] }))}
        value={tab}
        onChange={(id) => set({ tab: id === 'all' ? undefined : id }, { resetPage: true })}
        panelClassName="pt-3"
      >
        <Panel flush>
          {list.isPending ? (
            <LoadingBlock className="p-4" lines={8} label="Loading maintenance tasks" />
          ) : list.isError && !list.data ? (
            <ErrorState error={list.error} title="Could not load maintenance tasks" onRetry={() => void list.refetch()} retrying={list.isRefetching} />
          ) : (
            <>
              <Table
                caption={`${isTechnician ? 'My tasks' : 'Maintenance tasks'} · ${tabLabel[tab]}`}
                columns={columns}
                rows={list.data.content}
                getRowId={(t) => t.id}
                sort={tableSort}
                onSortChange={onSortChange}
                onRowClick={(t) => open(t.id)}
                rowLabel={(t) => `Open task ${t.title} on ${t.transformerCode}`}
                rowClassName={(t) => (t.id === focus ? 'bg-raised/60' : undefined)}
                updating={list.isPlaceholderData}
                maxHeight="calc(100dvh - 26rem)"
                empty={
                  <EmptyState
                    title={
                      hasFilters
                        ? 'No tasks match these filters'
                        : tab === 'overdue'
                          ? 'Nothing overdue'
                          : tab === 'upcoming'
                            ? 'No upcoming tasks'
                            : isTechnician
                              ? 'No tasks assigned to you'
                              : 'No maintenance tasks yet'
                    }
                    description={hasFilters ? 'Adjust or clear the filters.' : undefined}
                    action={
                      hasFilters ? (
                        <Button size="sm" variant="secondary" onClick={clearFilters}>
                          Clear filters
                        </Button>
                      ) : undefined
                    }
                  />
                }
              />
              <div className="border-t border-line">
                <Pagination
                  page={list.data.page}
                  totalPages={list.data.totalPages}
                  totalElements={list.data.totalElements}
                  size={list.data.size}
                  itemLabel="tasks"
                  onPageChange={setPage}
                  onSizeChange={setSize}
                />
              </div>
            </>
          )}
        </Panel>
      </Tabs>

      <MaintenanceDetailDrawer taskId={focus} fallback={list.data?.content.find((t) => t.id === focus)} onClose={close} />
      <RoleGate roles={['ADMIN', 'ENGINEER']}>
        <NewMaintenanceTaskDialog open={newOpen} onClose={() => setNewOpen(false)} onCreated={(t) => open(t.id)} />
      </RoleGate>
    </div>
  );
}
