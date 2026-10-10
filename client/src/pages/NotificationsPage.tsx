import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, CheckCheck, ChevronRight } from 'lucide-react';
import clsx from 'clsx';
import { useNotificationActions, useNotifications } from '@/hooks/useWorkflows';
import { useUrlState } from '@/hooks/useUrlState';
import { usePageParams } from '@/hooks/useListUrlParams';
import type { NotificationDto, NotificationListParams, NotificationType } from '@/types/api';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState, errorMessage } from '@/components/ui/ErrorState';
import { Field } from '@/components/ui/Field';
import { IconButton } from '@/components/ui/IconButton';
import { Pagination } from '@/components/ui/Pagination';
import { Panel } from '@/components/ui/Panel';
import { Select } from '@/components/ui/Select';
import { LoadingBlock } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { ClearFiltersButton, EnumFilter } from '@/components/workflow/FilterControls';
import { formatDateTime } from '@/utils/format';
import { notificationTypeLabel } from '@/utils/labels';
import { linkForResource } from '@/utils/links';

const TYPES = Object.keys(notificationTypeLabel) as NotificationType[];
const typeTone: Record<NotificationType, 'critical' | 'warning' | 'steel' | 'healthy' | 'offline'> = {
  NEW_CRITICAL_ALERT: 'critical',
  MAINTENANCE_ASSIGNED: 'steel',
  MAINTENANCE_OVERDUE: 'warning',
  UPCOMING_INSPECTION: 'steel',
  INCIDENT_RESOLVED: 'healthy',
  TRANSFORMER_OFFLINE: 'offline',
};

export default function NotificationsPage() {
  const { get, set } = useUrlState();
  const navigate = useNavigate();
  const toast = useToast();
  const { page, size, setPage, setSize } = usePageParams();
  const { markRead, markAllRead } = useNotificationActions();
  const readFilter = get('read');
  const type = get('type') as NotificationType | undefined;

  const params = useMemo<NotificationListParams>(() => {
    const p: NotificationListParams = { page, size };
    if (readFilter === 'unread') p.read = false;
    if (readFilter === 'read') p.read = true;
    if (type && TYPES.includes(type)) p.type = type;
    return p;
  }, [page, size, readFilter, type]);

  const list = useNotifications(params);
  const hasFilters = !!readFilter || !!type;

  const onMarkRead = async (n: NotificationDto) => {
    try {
      await markRead.mutateAsync(n.id);
    } catch (e) {
      toast.error('Could not mark as read', errorMessage(e));
    }
  };

  const onOpen = async (n: NotificationDto) => {
    const href = linkForResource(n.relatedType, n.relatedId);
    if (!n.read) markRead.mutate(n.id, { onError: (e) => toast.error('Could not mark as read', errorMessage(e)) });
    if (href) navigate(href);
  };

  const onMarkAll = async () => {
    try {
      await markAllRead.mutateAsync();
      toast.success('All notifications marked as read');
    } catch (e) {
      toast.error('Could not mark all as read', errorMessage(e));
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        eyebrow="Inbox"
        title="Notifications"
        description="Alerts, assignments and reminders addressed to you."
        actions={
          <Button variant="secondary" icon={<CheckCheck />} onClick={() => void onMarkAll()} loading={markAllRead.isPending}>
            Mark all read
          </Button>
        }
      />

      <Panel bodyClassName="grid grid-cols-2 gap-3 p-3 md:grid-cols-4">
        <Field label="Show">
          <Select value={readFilter ?? ''} onChange={(e) => set({ read: e.target.value }, { resetPage: true })}>
            <option value="">All</option>
            <option value="unread">Unread</option>
            <option value="read">Read</option>
          </Select>
        </Field>
        <EnumFilter label="Type" value={params.type ?? ''} onChange={(v) => set({ type: v }, { resetPage: true })} options={TYPES} labels={notificationTypeLabel} />
        {hasFilters && (
          <div className="col-span-2 flex items-end">
            <ClearFiltersButton onClick={() => set({ read: undefined, type: undefined }, { resetPage: true })} />
          </div>
        )}
      </Panel>

      <Panel flush>
        {list.isPending ? (
          <LoadingBlock className="p-4" lines={6} label="Loading notifications" />
        ) : list.isError && !list.data ? (
          <ErrorState error={list.error} title="Could not load notifications" onRetry={() => void list.refetch()} retrying={list.isRefetching} />
        ) : list.data.content.length === 0 ? (
          <EmptyState
            title={hasFilters ? 'No notifications match these filters' : 'You are all caught up'}
            description={hasFilters ? undefined : 'New alerts and assignments will appear here.'}
          />
        ) : (
          <>
            <ul aria-label="Notifications" className={clsx('divide-y divide-line', list.isPlaceholderData && 'opacity-70')}>
              {list.data.content.map((n) => {
                const href = linkForResource(n.relatedType, n.relatedId);
                return (
                  <li key={n.id} className={clsx('flex items-start gap-3 px-4 py-3', !n.read && 'bg-raised/40')}>
                    <span className="mt-1.5 flex h-2 w-2 shrink-0" aria-hidden="true">
                      {!n.read && <span className="h-2 w-2 rounded-full bg-accent" />}
                    </span>
                    <button
                      type="button"
                      onClick={() => void onOpen(n)}
                      className="group min-w-0 flex-1 rounded-sm text-left"
                      aria-label={`${n.read ? '' : 'Unread: '}${n.title}${href ? '' : ' (mark as read)'}`}
                    >
                      <span className="flex flex-wrap items-center gap-2">
                        {!n.read && <Badge tone="accent">Unread</Badge>}
                        <Badge tone={typeTone[n.type] ?? 'neutral'}>{notificationTypeLabel[n.type] ?? n.type}</Badge>
                        <span className={clsx('text-sm', n.read ? 'text-fg-muted' : 'font-semibold text-fg')}>{n.title}</span>
                      </span>
                      <span className="mt-1 block text-xs text-fg-muted">{n.message}</span>
                      <span className="mt-1 flex items-center gap-1 font-mono text-[0.7rem] text-fg-muted">
                        <time dateTime={n.createdAt}>{formatDateTime(n.createdAt)}</time>
                        {href && (
                          <span className="inline-flex items-center text-accent-ink group-hover:underline">
                            · Open <ChevronRight aria-hidden="true" className="h-3 w-3" />
                          </span>
                        )}
                      </span>
                    </button>
                    {!n.read && (
                      <IconButton
                        size="sm"
                        label={`Mark "${n.title}" as read`}
                        icon={<Check />}
                        onClick={() => void onMarkRead(n)}
                        disabled={markRead.isPending && markRead.variables === n.id}
                      />
                    )}
                  </li>
                );
              })}
            </ul>
            <div className="border-t border-line">
              <Pagination
                page={list.data.page}
                totalPages={list.data.totalPages}
                totalElements={list.data.totalElements}
                size={list.data.size}
                itemLabel="notifications"
                onPageChange={setPage}
                onSizeChange={setSize}
              />
            </div>
          </>
        )}
      </Panel>
    </div>
  );
}
