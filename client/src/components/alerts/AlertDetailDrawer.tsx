import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Play, UserCheck, Wrench } from 'lucide-react';
import { useAlert, useAlertActions } from '@/hooks/useWorkflows';
import { useAssignableUsers } from '@/hooks/useAdmin';
import { useAuth } from '@/context/AuthContext';
import type { AlertDto, Priority, Severity } from '@/types/api';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Drawer } from '@/components/ui/Drawer';
import { ErrorState, errorMessage } from '@/components/ui/ErrorState';
import { Field } from '@/components/ui/Field';
import { Select } from '@/components/ui/Select';
import { LoadingBlock } from '@/components/ui/Skeleton';
import { AlertStatusBadge, SeverityBadge } from '@/components/ui/StatusBadges';
import { useToast } from '@/components/ui/Toast';
import { MaintenanceCreateDialog } from '@/components/maintenance/MaintenanceCreateDialog';
import { DetailGrid, DrawerSection, shortId, Timeline } from '@/components/workflow/DetailBits';
import { ResolveAlertDialog } from './ResolveAlertDialog';
import { RecoveredBadge } from './RecoveredBadge';
import { formatDateTime, formatWithUnit } from '@/utils/format';
import { faultTypeLabel, humanize, roleLabel } from '@/utils/labels';
import { links } from '@/utils/links';

/** Default maintenance priority for an alert severity. */
export const PRIORITY_FOR_SEVERITY: Record<Severity, Priority> = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'URGENT',
};

export interface AlertDetailDrawerProps {
  alertId: string | undefined;
  /** Row data from the list, shown immediately while the detail loads. */
  fallback?: AlertDto;
  onClose: () => void;
}

export function AlertDetailDrawer({ alertId, fallback, onClose }: AlertDetailDrawerProps) {
  const detail = useAlert(alertId);
  const alert = detail.data ?? fallback;
  return (
    <Drawer
      open={!!alertId}
      onClose={onClose}
      title={alert ? `${faultTypeLabel[alert.faultType]} · ${alert.transformerCode}` : 'Alert'}
      widthClass="w-[min(34rem,100vw)]"
    >
      {alert ? (
        <AlertDetailBody alert={alert} />
      ) : detail.isError ? (
        <ErrorState error={detail.error} title="Could not load the alert" onRetry={() => void detail.refetch()} retrying={detail.isRefetching} />
      ) : (
        <LoadingBlock className="p-4" lines={8} label="Loading alert" />
      )}
    </Drawer>
  );
}

function AlertDetailBody({ alert }: { alert: AlertDto }) {
  const { hasRole } = useAuth();
  const canOperate = hasRole('ADMIN', 'ENGINEER', 'OPERATOR');
  const canResolve = hasRole('ADMIN', 'ENGINEER');
  const open = alert.status !== 'RESOLVED';
  const actions = useAlertActions();
  const toast = useToast();
  const users = useAssignableUsers(undefined, canOperate && open);
  const [assignee, setAssignee] = useState(alert.assignedUserId ?? '');
  const [resolveOpen, setResolveOpen] = useState(false);
  const [maintOpen, setMaintOpen] = useState(false);

  useEffect(() => setAssignee(alert.assignedUserId ?? ''), [alert.assignedUserId]);

  const run = async (label: string, failLabel: string, fn: () => Promise<unknown>) => {
    try {
      await fn();
      toast.success(label, `${faultTypeLabel[alert.faultType]} on ${alert.transformerCode}`);
    } catch (e) {
      toast.error(failLabel, errorMessage(e, 'The action could not be completed.'));
    }
  };

  const busy = actions.acknowledge.isPending || actions.update.isPending || actions.assign.isPending;
  const unit = alert.unit;

  return (
    <>
      <DrawerSection title="Summary">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <SeverityBadge value={alert.severity} />
          <AlertStatusBadge value={alert.status} />
          {!alert.active && alert.status !== 'RESOLVED' && <Badge>Inactive</Badge>}
          {alert.recovered && alert.status !== 'RESOLVED' && <RecoveredBadge />}
          {alert.recurrenceCount > 0 && <Badge tone="warning">Recurrence ×{alert.recurrenceCount}</Badge>}
        </div>
        <p className="mb-4 text-sm text-fg">{alert.description}</p>
        <DetailGrid
          items={[
            {
              label: 'Transformer',
              value: (
                <Link to={links.transformer(alert.transformerId)} className="text-accent hover:underline">
                  {alert.transformerCode}
                </Link>
              ),
            },
            { label: 'Location', value: alert.location },
            { label: 'Measured', value: formatWithUnit(alert.measuredValue, unit) },
            { label: 'Threshold', value: formatWithUnit(alert.threshold, unit) },
            { label: 'Peak value', value: formatWithUnit(alert.peakValue, unit) },
            { label: 'Peak severity', value: <SeverityBadge value={alert.peakSeverity} /> },
            { label: 'Raised', value: formatDateTime(alert.createdAt) },
            { label: 'Updated', value: formatDateTime(alert.updatedAt) },
            {
              label: 'Acknowledged',
              value: alert.acknowledgedAt ? `${formatDateTime(alert.acknowledgedAt)}${alert.acknowledgedBy ? ` · ${alert.acknowledgedBy}` : ''}` : 'Not yet',
            },
            { label: 'Assignee', value: alert.assignedUserName ?? 'Unassigned' },
            ...(alert.recovered && alert.recoveredAt ? [{ label: 'Readings normal since', value: formatDateTime(alert.recoveredAt) }] : []),
            ...(alert.resolvedAt
              ? [
                  { label: 'Resolved', value: `${formatDateTime(alert.resolvedAt)}${alert.resolvedBy ? ` · ${alert.resolvedBy}` : ''}` },
                  { label: 'Resolution notes', value: alert.resolutionNotes ?? '—', wide: true },
                ]
              : []),
          ]}
        />
      </DrawerSection>

      {open && (canOperate || canResolve) && (
        <DrawerSection title="Actions">
          {alert.recovered && (
            <p className="mb-3 text-xs text-fg-muted">
              Readings have returned to normal. Someone engaged with this alert, so it stays open until it is resolved with notes.
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            {canOperate && alert.status === 'NEW' && (
              <Button
                size="sm"
                variant="primary"
                icon={<UserCheck />}
                loading={actions.acknowledge.isPending}
                disabled={busy}
                onClick={() => run('Alert acknowledged', 'Could not acknowledge the alert', () => actions.acknowledge.mutateAsync(alert.id))}
              >
                Acknowledge
              </Button>
            )}
            {canOperate && alert.status === 'ACKNOWLEDGED' && (
              <Button
                size="sm"
                variant="secondary"
                icon={<Play />}
                loading={actions.update.isPending}
                disabled={busy}
                onClick={() =>
                  run('Alert marked in progress', 'Could not update the alert', () => actions.update.mutateAsync({ id: alert.id, body: { status: 'IN_PROGRESS' } }))
                }
              >
                Start progress
              </Button>
            )}
            {canResolve && (
              <Button size="sm" variant="secondary" icon={<CheckCircle2 />} onClick={() => setResolveOpen(true)}>
                Resolve
              </Button>
            )}
            {canResolve && (
              <Button size="sm" variant="secondary" icon={<Wrench />} onClick={() => setMaintOpen(true)}>
                Create maintenance
              </Button>
            )}
          </div>
          {canOperate && (
            <form
              className="mt-4 flex items-end gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (!assignee) return;
                void run('Alert assigned', 'Could not assign the alert', () => actions.assign.mutateAsync({ id: alert.id, userId: assignee }));
              }}
            >
              <Field label="Assign to" className="flex-1" hint={users.isError ? 'Could not load users.' : undefined}>
                <Select value={assignee} onChange={(e) => setAssignee(e.target.value)} disabled={users.isPending}>
                  <option value="">{users.isPending ? 'Loading…' : 'Select a user'}</option>
                  {(users.data ?? []).map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} · {roleLabel[u.role]}
                    </option>
                  ))}
                </Select>
              </Field>
              <Button
                type="submit"
                size="md"
                variant="secondary"
                loading={actions.assign.isPending}
                disabled={busy || !assignee || assignee === alert.assignedUserId}
              >
                Assign
              </Button>
            </form>
          )}
        </DrawerSection>
      )}

      <DrawerSection title="Linked maintenance">
        {alert.maintenanceIds.length === 0 ? (
          <p className="text-xs text-fg-muted">No maintenance tasks linked to this alert.</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {alert.maintenanceIds.map((id) => (
              <li key={id}>
                <Link to={links.maintenance(id)} className="font-mono text-xs text-accent hover:underline">
                  Task {shortId(id)}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </DrawerSection>

      <DrawerSection title="Event timeline">
        <Timeline
          items={[...alert.events]
            .sort((a, b) => a.at.localeCompare(b.at))
            .map((ev, i) => ({ key: `${ev.at}-${i}`, at: ev.at, title: humanize(ev.type), detail: ev.message, actor: ev.actor }))}
        />
      </DrawerSection>

      {canResolve && (
        <>
          <ResolveAlertDialog alert={alert} open={resolveOpen} onClose={() => setResolveOpen(false)} />
          <MaintenanceCreateDialog
            open={maintOpen}
            onClose={() => setMaintOpen(false)}
            transformerId={alert.transformerId}
            transformerLabel={`${alert.transformerCode} · ${alert.transformerName}`}
            alertId={alert.id}
            defaultTitle={`Investigate ${alert.faultType} on ${alert.transformerCode}`}
            defaultDescription={alert.description}
            defaultPriority={PRIORITY_FOR_SEVERITY[alert.severity]}
          />
        </>
      )}
    </>
  );
}
