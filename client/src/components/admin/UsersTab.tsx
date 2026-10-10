import { useMemo, useState } from 'react';
import { Pencil, Search, UserPlus } from 'lucide-react';
import { useAdminUsers } from '@/hooks/useAdmin';
import { useUrlState } from '@/hooks/useUrlState';
import { useDebouncedUrlParam } from '@/hooks/useDebouncedUrlParam';
import { usePageParams } from '@/hooks/useListUrlParams';
import { useAuth } from '@/context/AuthContext';
import type { Role, UserDto } from '@/types/api';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { Pagination } from '@/components/ui/Pagination';
import { Panel } from '@/components/ui/Panel';
import { LoadingBlock } from '@/components/ui/Skeleton';
import { Table, type Column } from '@/components/ui/Table';
import { ClearFiltersButton, EnumFilter } from '@/components/workflow/FilterControls';
import { formatDate } from '@/utils/format';
import { ROLES, roleLabel } from '@/utils/labels';
import { UserFormDialog } from './UserFormDialog';

export function UsersTab() {
  const { user: me } = useAuth();
  const { get, set } = useUrlState();
  const [q, setQ] = useDebouncedUrlParam('q');
  const { page, size, setPage, setSize } = usePageParams();
  const role = get('role') as Role | undefined;
  const [dialog, setDialog] = useState<{ open: boolean; user: UserDto | null }>({ open: false, user: null });

  const params = useMemo(() => {
    const p: { page: number; size: number; q?: string; role?: Role } = { page, size };
    const qv = get('q');
    if (qv) p.q = qv;
    if (role && ROLES.includes(role)) p.role = role;
    return p;
  }, [get, page, size, role]);

  const list = useAdminUsers(params);
  const hasFilters = !!params.q || !!params.role;
  const clear = () => set({ q: undefined, role: undefined }, { resetPage: true });

  const columns: Column<UserDto>[] = [
    {
      key: 'name',
      header: 'Name',
      rowHeader: true,
      cell: (u) => (
        <span>
          {u.name}
          {u.id === me?.id && <span className="ml-1.5 text-xs text-fg-muted">(you)</span>}
        </span>
      ),
    },
    { key: 'email', header: 'Email', cell: (u) => <span className="font-mono text-xs">{u.email}</span> },
    { key: 'role', header: 'Role', cell: (u) => <Badge tone={u.role === 'ADMIN' ? 'accent' : 'steel'}>{roleLabel[u.role]}</Badge> },
    { key: 'region', header: 'Region', cell: (u) => u.region ?? <span className="text-fg-muted">All regions</span> },
    { key: 'active', header: 'Status', cell: (u) => (u.active ? <Badge tone="healthy">Active</Badge> : <Badge tone="offline">Inactive</Badge>) },
    { key: 'created', header: 'Created', cell: (u) => <span className="font-mono text-xs text-fg-muted">{formatDate(u.createdAt)}</span> },
    {
      key: 'actions',
      header: <span className="sr-only">Actions</span>,
      align: 'right',
      cell: (u) => (
        <Button size="sm" variant="ghost" icon={<Pencil />} onClick={() => setDialog({ open: true, user: u })} aria-label={`Edit ${u.name}`}>
          Edit
        </Button>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-3">
      <Panel bodyClassName="grid grid-cols-2 items-end gap-3 p-3 md:grid-cols-4">
        <Field label="Search users" className="col-span-2">
          <Input type="search" leading={<Search />} placeholder="Name or email" value={q} onChange={(e) => setQ(e.target.value)} />
        </Field>
        <EnumFilter label="Role" value={params.role ?? ''} onChange={(v) => set({ role: v }, { resetPage: true })} options={ROLES} labels={roleLabel} />
        <div className="flex items-end justify-end gap-2">
          {hasFilters && <ClearFiltersButton onClick={clear} />}
          <Button variant="primary" icon={<UserPlus />} onClick={() => setDialog({ open: true, user: null })}>
            Create user
          </Button>
        </div>
      </Panel>

      <Panel flush>
        {list.isPending ? (
          <LoadingBlock className="p-4" lines={6} label="Loading users" />
        ) : list.isError && !list.data ? (
          <ErrorState error={list.error} title="Could not load users" onRetry={() => void list.refetch()} retrying={list.isRefetching} />
        ) : (
          <>
            <Table
              caption="Users"
              columns={columns}
              rows={list.data.content}
              getRowId={(u) => u.id}
              updating={list.isPlaceholderData}
              maxHeight="calc(100dvh - 24rem)"
              empty={<EmptyState title={hasFilters ? 'No users match these filters' : 'No users'} />}
            />
            <div className="border-t border-line">
              <Pagination
                page={list.data.page}
                totalPages={list.data.totalPages}
                totalElements={list.data.totalElements}
                size={list.data.size}
                itemLabel="users"
                onPageChange={setPage}
                onSizeChange={setSize}
              />
            </div>
          </>
        )}
      </Panel>

      <UserFormDialog
        open={dialog.open}
        user={dialog.user}
        currentUserId={me?.id}
        onClose={() => setDialog((d) => ({ ...d, open: false }))}
      />
    </div>
  );
}
