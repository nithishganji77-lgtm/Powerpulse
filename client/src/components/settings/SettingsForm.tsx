import { useState } from 'react';
import { useFieldArray, useForm, type FieldPath } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Lock, Plus, Save, Trash2 } from 'lucide-react';
import clsx from 'clsx';
import { useUpdateSettings } from '@/hooks/useAdmin';
import { ApiError } from '@/services/apiClient';
import type { SystemSettingsDto } from '@/types/api';
import { Button } from '@/components/ui/Button';
import { errorMessage } from '@/components/ui/ErrorState';
import { Field } from '@/components/ui/Field';
import { IconButton } from '@/components/ui/IconButton';
import { Input } from '@/components/ui/Input';
import { Panel } from '@/components/ui/Panel';
import { useToast } from '@/components/ui/Toast';
import { FormError } from '@/components/workflow/DetailBits';
import { formatDateTime } from '@/utils/format';
import { ROLES, roleLabel } from '@/utils/labels';
import {
  formatTotal,
  formPathForServerField,
  NOTIFICATION_ROLE_FIELDS,
  settingsSchema,
  THRESHOLD_METRICS,
  toFormValues,
  toPatch,
  WEIGHT_FIELDS,
  WEIGHTS_TOTAL,
  weightsTotal,
  type SettingsFormValues,
} from './settingsSchema';

export interface SettingsFormProps {
  settings: SystemSettingsDto;
  /** Only ADMIN may edit; everyone else sees a read-only form. */
  editable: boolean;
}

export function SettingsForm({ settings, editable }: SettingsFormProps) {
  const update = useUpdateSettings();
  const toast = useToast();
  const [newLocation, setNewLocation] = useState('');
  const [newLocationError, setNewLocationError] = useState<string>();
  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    setError,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<SettingsFormValues>({ resolver: zodResolver(settingsSchema), defaultValues: toFormValues(settings) });
  const locations = useFieldArray({ control, name: 'locations' });

  const weights = watch('healthWeights');
  const total = weightsTotal(weights);
  const totalOk = Math.abs(total - 100) <= 0.001;
  const totalError = (errors as Record<string, { message?: string } | undefined>)[WEIGHTS_TOTAL]?.message;

  const submit = async (v: SettingsFormValues) => {
    try {
      const saved = await update.mutateAsync(toPatch(v));
      reset(toFormValues(saved));
      toast.success('Settings saved');
    } catch (e) {
      let unmapped: string[] = [];
      if (e instanceof ApiError && e.fieldErrors.length) {
        for (const fe of e.fieldErrors) {
          const path = formPathForServerField(fe.field);
          if (path) setError(path as FieldPath<SettingsFormValues>, { type: 'server', message: fe.message });
          else unmapped.push(`${fe.field}: ${fe.message}`);
        }
      } else {
        unmapped = [errorMessage(e, 'Could not save settings.')];
      }
      if (unmapped.length) setError('root.server', { type: 'server', message: unmapped.join(' · ') });
      toast.error('Settings not saved', e instanceof ApiError ? e.message : undefined);
    }
  };

  const addLocation = () => {
    const name = newLocation.trim();
    if (!name) return setNewLocationError('Enter a location name');
    if (locations.fields.some((_, i) => watch(`locations.${i}.name`).trim().toLowerCase() === name.toLowerCase())) {
      return setNewLocationError('That location already exists');
    }
    locations.append({ name });
    setNewLocation('');
    setNewLocationError(undefined);
  };

  const numberOpts = { valueAsNumber: true } as const;

  return (
    <form noValidate onSubmit={handleSubmit(submit)} aria-label="System settings" className="flex flex-col gap-4">
      {!editable && (
        <div role="note" className="flex items-start gap-2 rounded-sm border border-line bg-raised/50 px-3 py-2 text-sm text-fg-muted">
          <Lock aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
          Read-only: only administrators can change system settings.
        </div>
      )}
      <FormError message={errors.root?.server?.message} />

      <fieldset disabled={!editable || isSubmitting} className="flex min-w-0 flex-col gap-4">
        <Panel
          title="Fault thresholds"
          description="Configurable demo defaults — not universal electrical safety limits."
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[34rem] text-sm">
              <caption className="sr-only">Good, warn and critical threshold per metric</caption>
              <thead>
                <tr className="text-left font-mono text-label uppercase text-fg-muted">
                  <th scope="col" className="pb-2 pr-3 font-normal">Metric</th>
                  <th scope="col" className="pb-2 pr-3 font-normal">Good</th>
                  <th scope="col" className="pb-2 pr-3 font-normal">Warn</th>
                  <th scope="col" className="pb-2 font-normal">Critical</th>
                </tr>
              </thead>
              <tbody>
                {THRESHOLD_METRICS.map((m) => (
                  <tr key={m.key} className="border-t border-line/70 align-top">
                    <th scope="row" className="py-2 pr-3 text-left font-normal">
                      <span className="block text-fg">{m.label}</span>
                      <span className="block text-xs text-fg-muted">
                        {m.unit} · {m.direction === 'higher' ? 'higher is worse (good < warn < critical)' : 'lower is worse (good > warn > critical)'}
                      </span>
                    </th>
                    {(['good', 'warn', 'critical'] as const).map((lvl) => (
                      <td key={lvl} className="py-2 pr-3 last:pr-0">
                        <Field label={`${m.label} ${lvl}`} hideLabel error={errors.thresholds?.[m.key]?.[lvl]?.message}>
                          <Input type="number" step="any" inputMode="decimal" {...register(`thresholds.${m.key}.${lvl}`, numberOpts)} />
                        </Field>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <Panel title="Detection" description="How stale readings and recoveries are judged.">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Sensor timeout" error={errors.sensorTimeoutSeconds?.message} hint="Seconds without a reading before a transformer is offline.">
                <Input type="number" min={10} step={1} inputMode="numeric" trailing="s" {...register('sensorTimeoutSeconds', numberOpts)} />
              </Field>
              <Field label="Recovery readings" error={errors.recoveryReadings?.message} hint="Consecutive normal readings before an alert recovers.">
                <Input type="number" min={1} step={1} inputMode="numeric" {...register('recoveryReadings', numberOpts)} />
              </Field>
            </div>
          </Panel>

          <Panel
            title="Health score weights"
            description="Maximum penalty per factor. Must add up to 100."
            actions={
              <span
                aria-live="polite"
                className={clsx('rounded-sm border px-2 py-0.5 font-mono text-xs', totalOk ? 'border-healthy/50 text-healthy' : 'border-critical/60 text-critical')}
              >
                Total {formatTotal(total)} / 100{totalOk ? ' ✓' : ' ✗'}
              </span>
            }
          >
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              {WEIGHT_FIELDS.map((w) => (
                <Field key={w.key} label={w.label} error={errors.healthWeights?.[w.key]?.message}>
                  <Input type="number" min={0} max={100} step="any" inputMode="decimal" {...register(`healthWeights.${w.key}`, numberOpts)} />
                </Field>
              ))}
            </div>
            {totalError && (
              <p role="alert" className="mt-2 text-xs text-critical">
                {totalError}
              </p>
            )}
          </Panel>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <Panel title="Notifications" description="Which roles receive each notification type.">
            <div className="flex flex-col gap-3">
              {NOTIFICATION_ROLE_FIELDS.map((n) => (
                <fieldset key={n.key} className="min-w-0">
                  <legend className="mb-1.5 font-mono text-label uppercase text-fg-muted">{n.label}</legend>
                  <div className="flex flex-wrap gap-x-4 gap-y-2">
                    {ROLES.map((r) => (
                      <label key={r} className="flex items-center gap-2 text-sm">
                        <input type="checkbox" value={r} className="h-4 w-4 accent-[rgb(var(--accent))]" {...register(`notifications.${n.key}`)} />
                        {roleLabel[r]}
                      </label>
                    ))}
                  </div>
                  {errors.notifications?.[n.key]?.message && (
                    <p role="alert" className="mt-1 text-xs text-critical">
                      {errors.notifications[n.key]?.message}
                    </p>
                  )}
                </fieldset>
              ))}
              <Field label="Upcoming inspection window" error={errors.notifications?.upcomingInspectionDays?.message} hint="Days ahead for upcoming-inspection reminders and the Upcoming tab." className="sm:max-w-xs">
                <Input type="number" min={1} step={1} inputMode="numeric" trailing="days" {...register('notifications.upcomingInspectionDays', numberOpts)} />
              </Field>
            </div>
          </Panel>

          <Panel title="Simulation" description="Simulator behaviour for demo telemetry.">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="col-span-full flex items-center gap-2 text-sm">
                <input type="checkbox" className="h-4 w-4 accent-[rgb(var(--accent))]" {...register('simulation.enabled')} />
                Simulator enabled
              </label>
              <Field label="Interval" error={errors.simulation?.intervalSeconds?.message} hint="Seconds between simulated readings.">
                <Input type="number" min={1} step={1} inputMode="numeric" trailing="s" {...register('simulation.intervalSeconds', numberOpts)} />
              </Field>
              <Field label="Noise factor" error={errors.simulation?.noiseFactor?.message} hint="Multiplier for random variation (1 = default).">
                <Input type="number" min={0} step="0.1" inputMode="decimal" {...register('simulation.noiseFactor', numberOpts)} />
              </Field>
            </div>
          </Panel>
        </div>

        <Panel title="Locations" description="Regions available when registering transformers and users.">
          {locations.fields.length === 0 ? (
            <p className="mb-3 text-xs text-fg-muted">No locations configured.</p>
          ) : (
            <ul className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {locations.fields.map((f, i) => (
                <li key={f.id} className="flex items-start gap-2">
                  <Field label={`Location ${i + 1}`} hideLabel className="flex-1" error={errors.locations?.[i]?.name?.message}>
                    <Input {...register(`locations.${i}.name`)} />
                  </Field>
                  {editable && (
                    <IconButton label={`Remove location ${watch(`locations.${i}.name`) || i + 1}`} icon={<Trash2 />} onClick={() => locations.remove(i)} />
                  )}
                </li>
              ))}
            </ul>
          )}
          {errors.locations?.message && (
            <p role="alert" className="mb-2 text-xs text-critical">
              {errors.locations.message}
            </p>
          )}
          {editable && (
            <div className="flex items-end gap-2 sm:max-w-md">
              <Field label="New location" className="flex-1" error={newLocationError}>
                <Input
                  value={newLocation}
                  onChange={(e) => {
                    setNewLocation(e.target.value);
                    setNewLocationError(undefined);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addLocation();
                    }
                  }}
                />
              </Field>
              <Button variant="secondary" icon={<Plus />} onClick={addLocation}>
                Add
              </Button>
            </div>
          )}
        </Panel>
      </fieldset>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-mono text-xs text-fg-muted">
          Last updated {formatDateTime(settings.updatedAt)}
          {settings.updatedBy ? ` by ${settings.updatedBy}` : ''}
        </p>
        {editable && (
          <div className="flex gap-2">
            <Button variant="ghost" disabled={!isDirty || isSubmitting} onClick={() => reset(toFormValues(settings))}>
              Discard changes
            </Button>
            <Button type="submit" variant="primary" icon={<Save />} loading={isSubmitting}>
              Save settings
            </Button>
          </div>
        )}
      </div>
    </form>
  );
}
