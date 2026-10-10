import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ApiError } from '@/services/apiClient';
import { useAlertActions } from '@/hooks/useWorkflows';
import type { AlertDto } from '@/types/api';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { errorMessage } from '@/components/ui/ErrorState';
import { Field } from '@/components/ui/Field';
import { Textarea } from '@/components/ui/Textarea';
import { useToast } from '@/components/ui/Toast';
import { FormError } from '@/components/workflow/DetailBits';
import { faultTypeLabel } from '@/utils/labels';

const schema = z.object({
  resolutionNotes: z
    .string()
    .trim()
    .min(5, 'Resolution notes must be at least 5 characters')
    .max(2000, 'Resolution notes must be at most 2000 characters'),
});
type Values = z.infer<typeof schema>;

export interface ResolveAlertDialogProps {
  alert: AlertDto;
  open: boolean;
  onClose: () => void;
}

/** Resolve an alert with required notes (ADMIN/ENGINEER). */
export function ResolveAlertDialog({ alert, open, onClose }: ResolveAlertDialogProps) {
  const { resolve } = useAlertActions();
  const toast = useToast();
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { resolutionNotes: '' } });

  useEffect(() => {
    if (open) reset({ resolutionNotes: '' });
  }, [open, reset]);

  const submit = async (v: Values) => {
    try {
      await resolve.mutateAsync({ id: alert.id, notes: v.resolutionNotes.trim() });
      toast.success('Alert resolved', `${faultTypeLabel[alert.faultType]} on ${alert.transformerCode}`);
      onClose();
    } catch (e) {
      const fe = e instanceof ApiError ? e.fieldErrors.find((f) => f.field === 'resolutionNotes') : undefined;
      if (fe) setError('resolutionNotes', { type: 'server', message: fe.message });
      else setError('root.server', { type: 'server', message: errorMessage(e, 'Could not resolve the alert.') });
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="sm"
      title="Resolve alert"
      description={`${faultTypeLabel[alert.faultType]} on ${alert.transformerCode}. Notes are stored with the incident record.`}
      dismissible={!isSubmitting}
    >
      <form noValidate onSubmit={handleSubmit(submit)} className="flex flex-col gap-3" aria-label="Resolve alert">
        <FormError message={errors.root?.server?.message} />
        <Field label="Resolution notes" required error={errors.resolutionNotes?.message} hint="What was found and done (min 5 characters).">
          <Textarea rows={4} {...register('resolutionNotes')} />
        </Field>
        <div className="mt-2 flex justify-end gap-2 border-t border-line pt-4">
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={isSubmitting}>
            Resolve alert
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
