import { useEffect } from 'react';
import { useForm, type FieldPath } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useUserActions } from '@/hooks/useAdmin';
import { useLocations } from '@/hooks/useMonitoring';
import { ApiError } from '@/services/apiClient';
import type { Role, UserDto, UserUpdateRequest } from '@/types/api';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { errorMessage } from '@/components/ui/ErrorState';
import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { useToast } from '@/components/ui/Toast';
import { FormError } from '@/components/workflow/DetailBits';
import { ROLES, roleLabel } from '@/utils/labels';

const password = z
  .string()
  .min(10, 'Password must be at least 10 characters')
  .max(128, 'Password must be at most 128 characters')
  .regex(/[A-Za-z]/, 'Password must contain a letter')
  .regex(/\d/, 'Password must contain a digit');

const base = {
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(80, 'Name must be at most 80 characters'),
  role: z.enum(['ADMIN', 'ENGINEER', 'OPERATOR', 'TECHNICIAN']),
  region: z.string(),
};

const createSchema = z.object({
  ...base,
  email: z.string().trim().min(1, 'Email is required').email('Enter a valid email address'),
  password,
  active: z.boolean(),
});

const editSchema = z.object({
  ...base,
  email: z.string(),
  password: z.union([z.literal(''), password]),
  active: z.boolean(),
});

type Values = z.infer<typeof createSchema>;
const FIELDS = ['name', 'email', 'password', 'role', 'region', 'active'];

export interface UserFormDialogProps {
  open: boolean;
  onClose: () => void;
  /** Edit this user; omit to create. */
  user?: UserDto | null;
  /** Current admin's id (to warn about self-demotion). */
  currentUserId?: string;
}

function defaults(user?: UserDto | null): Values {
  return {
    name: user?.name ?? '',
    email: user?.email ?? '',
    password: '',
    role: user?.role ?? 'OPERATOR',
    region: user?.region ?? '',
    active: user?.active ?? true,
  };
}

export function UserFormDialog({ open, onClose, user, currentUserId }: UserFormDialogProps) {
  const editing = !!user;
  const { create, update } = useUserActions();
  const locations = useLocations();
  const toast = useToast();
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(editing ? editSchema : createSchema), defaultValues: defaults(user) });

  useEffect(() => {
    if (open) reset(defaults(user));
  }, [open, user, reset]);

  const submit = async (v: Values) => {
    try {
      if (user) {
        const body: UserUpdateRequest = {
          name: v.name.trim(),
          role: v.role as Role,
          region: v.region || null,
          active: v.active,
        };
        if (v.password) body.password = v.password;
        await update.mutateAsync({ id: user.id, body });
        toast.success('User updated', v.name.trim());
      } else {
        await create.mutateAsync({
          name: v.name.trim(),
          email: v.email.trim(),
          password: v.password,
          role: v.role as Role,
          region: v.region || null,
        });
        toast.success('User created', v.email.trim());
      }
      onClose();
    } catch (e) {
      if (e instanceof ApiError && e.fieldErrors.length) {
        let mapped = false;
        for (const fe of e.fieldErrors) {
          if (FIELDS.includes(fe.field)) {
            setError(fe.field as FieldPath<Values>, { type: 'server', message: fe.message });
            mapped = true;
          }
        }
        if (mapped) return;
      }
      setError('root.server', { type: 'server', message: errorMessage(e, editing ? 'Could not update the user.' : 'Could not create the user.') });
    }
  };

  const self = editing && user?.id === currentUserId;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={editing ? `Edit ${user?.name}` : 'Create user'}
      description={editing ? user?.email : 'New users can sign in immediately with this password.'}
      dismissible={!isSubmitting}
    >
      <form noValidate onSubmit={handleSubmit(submit)} className="flex flex-col gap-3" aria-label={editing ? 'Edit user' : 'Create user'}>
        <FormError message={errors.root?.server?.message} />
        <Field label="Name" required error={errors.name?.message}>
          <Input autoComplete="off" {...register('name')} />
        </Field>
        {!editing && (
          <Field label="Email" required error={errors.email?.message}>
            <Input type="email" autoComplete="off" {...register('email')} />
          </Field>
        )}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Role" required error={errors.role?.message} hint={self ? 'You cannot remove your own admin role.' : undefined}>
            <Select {...register('role')}>
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {roleLabel[r]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Region" error={errors.region?.message}>
            <Select {...register('region')}>
              <option value="">All regions</option>
              {(locations.data ?? []).map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
              {user?.region && !(locations.data ?? []).includes(user.region) && <option value={user.region}>{user.region}</option>}
            </Select>
          </Field>
        </div>
        <Field
          label={editing ? 'New password' : 'Password'}
          required={!editing}
          error={errors.password?.message}
          hint={editing ? 'Leave blank to keep the current password. Min 10 characters with a letter and a digit.' : 'Min 10 characters with a letter and a digit.'}
        >
          <Input type="password" autoComplete="new-password" {...register('password')} />
        </Field>
        {editing && (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="h-4 w-4 accent-[rgb(var(--accent))]" {...register('active')} />
            Active (can sign in)
          </label>
        )}
        <div className="mt-2 flex justify-end gap-2 border-t border-line pt-4">
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={isSubmitting}>
            {editing ? 'Save changes' : 'Create user'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
