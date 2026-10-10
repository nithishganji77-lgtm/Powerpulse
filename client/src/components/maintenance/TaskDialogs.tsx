import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ApiError } from '@/services/apiClient';
import { useMaintenanceActions } from '@/hooks/useWorkflows';
import type { MaintenanceDto } from '@/types/api';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { errorMessage } from '@/components/ui/ErrorState';
import { Field } from '@/components/ui/Field';
import { Textarea } from '@/components/ui/Textarea';
import { useToast } from '@/components/ui/Toast';
import { FormError } from '@/components/workflow/DetailBits';

interface TaskDialogProps {
  task: MaintenanceDto;
  open: boolean;
  onClose: () => void;
}

const cancelSchema = z.object({
  cancelReason: z.string().trim().min(3, 'A cancellation reason is required').max(1000, 'Reason must be at most 1000 characters'),
});
type CancelValues = z.infer<typeof cancelSchema>;

/** Cancel a task with a required reason (ADMIN/ENGINEER). */
export function CancelTaskDialog({ task, open, onClose }: TaskDialogProps) {
  const { update } = useMaintenanceActions();
  const toast = useToast();
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CancelValues>({ resolver: zodResolver(cancelSchema), defaultValues: { cancelReason: '' } });

  useEffect(() => {
    if (open) reset({ cancelReason: '' });
  }, [open, reset]);

  const submit = async (v: CancelValues) => {
    try {
      await update.mutateAsync({ id: task.id, body: { status: 'CANCELLED', cancelReason: v.cancelReason.trim() } });
      toast.success('Task cancelled', task.title);
      onClose();
    } catch (e) {
      const fe = e instanceof ApiError ? e.fieldErrors.find((f) => f.field === 'cancelReason') : undefined;
      if (fe) setError('cancelReason', { type: 'server', message: fe.message });
      else setError('root.server', { type: 'server', message: errorMessage(e, 'Could not cancel the task.') });
    }
  };

  return (
    <Dialog open={open} onClose={onClose} size="sm" title="Cancel task" description={`${task.title} · ${task.transformerCode}. Cancelled tasks cannot be reopened.`} dismissible={!isSubmitting}>
      <form noValidate onSubmit={handleSubmit(submit)} className="flex flex-col gap-3" aria-label="Cancel task">
        <FormError message={errors.root?.server?.message} />
        <Field label="Reason" required error={errors.cancelReason?.message}>
          <Textarea rows={3} {...register('cancelReason')} />
        </Field>
        <div className="mt-2 flex justify-end gap-2 border-t border-line pt-4">
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Keep task
          </Button>
          <Button type="submit" variant="danger" loading={isSubmitting}>
            Cancel task
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

const completeSchema = z.object({
  inspectionFindings: z.string().trim().max(4000, 'Findings must be at most 4000 characters').optional(),
  workNote: z.string().trim().max(2000, 'Note must be at most 2000 characters').optional(),
});
type CompleteValues = z.infer<typeof completeSchema>;

/** Complete an IN_PROGRESS task with optional findings and a closing note. */
export function CompleteTaskDialog({ task, open, onClose }: TaskDialogProps) {
  const { complete } = useMaintenanceActions();
  const toast = useToast();
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CompleteValues>({ resolver: zodResolver(completeSchema) });

  useEffect(() => {
    if (open) reset({ inspectionFindings: task.inspectionFindings ?? '', workNote: '' });
  }, [open, reset, task.inspectionFindings]);

  const submit = async (v: CompleteValues) => {
    const body: { inspectionFindings?: string; workNote?: string } = {};
    const findings = v.inspectionFindings?.trim();
    if (findings && findings !== (task.inspectionFindings ?? '')) body.inspectionFindings = findings;
    if (v.workNote?.trim()) body.workNote = v.workNote.trim();
    try {
      await complete.mutateAsync({ id: task.id, body });
      toast.success('Task completed', task.title);
      onClose();
    } catch (e) {
      setError('root.server', { type: 'server', message: errorMessage(e, 'Could not complete the task.') });
    }
  };

  return (
    <Dialog open={open} onClose={onClose} title="Complete task" description={`${task.title} · ${task.transformerCode}`} dismissible={!isSubmitting}>
      <form noValidate onSubmit={handleSubmit(submit)} className="flex flex-col gap-3" aria-label="Complete task">
        <FormError message={errors.root?.server?.message} />
        <Field label="Inspection findings" error={errors.inspectionFindings?.message} hint="Optional.">
          <Textarea rows={4} {...register('inspectionFindings')} />
        </Field>
        <Field label="Closing note" error={errors.workNote?.message} hint="Optional. Added to the work notes.">
          <Textarea rows={3} {...register('workNote')} />
        </Field>
        <div className="mt-2 flex justify-end gap-2 border-t border-line pt-4">
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Back
          </Button>
          <Button type="submit" variant="primary" loading={isSubmitting}>
            Mark complete
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
