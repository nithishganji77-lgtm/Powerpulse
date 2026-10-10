import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AdminUsersPage from '@/pages/AdminUsersPage';
import { authService } from '@/services/authService';
import { adminService } from '@/services/adminService';
import { transformerService } from '@/services/transformerService';
import { ApiError } from '@/services/apiClient';
import { makeUser, renderWithProviders } from '@/test/renderWithProviders';
import { page } from '@/test/fixtures';

vi.mock('@/services/authService', () => ({
  authService: { me: vi.fn(), csrf: vi.fn(), login: vi.fn(), logout: vi.fn() },
}));
vi.mock('@/services/adminService', () => ({
  adminService: { users: vi.fn(), createUser: vi.fn(), updateUser: vi.fn(), auditLogs: vi.fn() },
  userService: { assignable: vi.fn() },
}));
vi.mock('@/services/transformerService', () => ({
  transformerService: { all: vi.fn(), locations: vi.fn(), list: vi.fn() },
}));

const svc = vi.mocked(adminService);
const admin = makeUser('ADMIN');

describe('AdminUsersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(authService.csrf).mockResolvedValue(undefined);
    vi.mocked(authService.me).mockResolvedValue(admin);
    vi.mocked(transformerService.locations).mockResolvedValue(['Riverside', 'Harbour']);
    svc.users.mockResolvedValue(page([admin, makeUser('TECHNICIAN', { name: 'Tara Tech' })]));
    svc.auditLogs.mockResolvedValue(
      page([{ id: 'l1', actorId: 'u1', actorName: 'Ada Admin', action: 'USER_CREATED', entityType: 'USER', entityId: 'u9', summary: 'Created user', at: new Date().toISOString() }]),
    );
  });

  it('validates the create-user form on the client', async () => {
    renderWithProviders(<AdminUsersPage />, { route: '/admin/users', path: '/admin/users' });
    await screen.findByText('Tara Tech');
    await userEvent.click(screen.getByRole('button', { name: 'Create user' }));
    const dialog = await screen.findByRole('dialog', { name: 'Create user' });
    await userEvent.type(within(dialog).getByLabelText(/email/i), 'not-an-email');
    await userEvent.type(within(dialog).getByLabelText(/^password/i), 'abcdefghij');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Create user' }));
    expect(await within(dialog).findByText('Name must be at least 2 characters')).toBeInTheDocument();
    expect(within(dialog).getByText('Enter a valid email address')).toBeInTheDocument();
    expect(within(dialog).getByText('Password must contain a digit')).toBeInTheDocument();
    expect(svc.createUser).not.toHaveBeenCalled();
  });

  it('creates a user and shows a 409 conflict message from the server', async () => {
    svc.createUser.mockRejectedValue(new ApiError(409, 'CONFLICT', 'A user with this email already exists'));
    renderWithProviders(<AdminUsersPage />, { route: '/admin/users', path: '/admin/users' });
    await screen.findByText('Tara Tech');
    await userEvent.click(screen.getByRole('button', { name: 'Create user' }));
    const dialog = await screen.findByRole('dialog', { name: 'Create user' });
    await userEvent.type(within(dialog).getByLabelText(/name/i), 'New Person');
    await userEvent.type(within(dialog).getByLabelText(/email/i), 'new@test.local');
    await userEvent.type(within(dialog).getByLabelText(/^password/i), 'abcdefghij1');
    await userEvent.selectOptions(within(dialog).getByLabelText(/role/i), 'TECHNICIAN');
    await userEvent.selectOptions(within(dialog).getByLabelText(/region/i), 'Harbour');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Create user' }));
    await waitFor(() =>
      expect(svc.createUser).toHaveBeenCalledWith({
        name: 'New Person',
        email: 'new@test.local',
        password: 'abcdefghij1',
        role: 'TECHNICIAN',
        region: 'Harbour',
      }),
    );
    expect(await within(dialog).findByText('A user with this email already exists')).toBeInTheDocument();
  });

  it('shows the last-admin 409 when editing', async () => {
    svc.updateUser.mockRejectedValue(new ApiError(409, 'CONFLICT', 'Cannot remove the last active administrator'));
    renderWithProviders(<AdminUsersPage />, { route: '/admin/users', path: '/admin/users' });
    await userEvent.click(await screen.findByRole('button', { name: `Edit ${admin.name}` }));
    const dialog = await screen.findByRole('dialog', { name: `Edit ${admin.name}` });
    await userEvent.selectOptions(within(dialog).getByLabelText(/role/i), 'ENGINEER');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(svc.updateUser).toHaveBeenCalledWith(admin.id, { name: admin.name, role: 'ENGINEER', region: null, active: true }));
    expect(await within(dialog).findByText('Cannot remove the last active administrator')).toBeInTheDocument();
  });

  it('filters users by role and shows the audit log tab', async () => {
    renderWithProviders(<AdminUsersPage />, { route: '/admin/users', path: '/admin/users' });
    await screen.findByText('Tara Tech');
    await userEvent.selectOptions(screen.getByLabelText('Role'), 'TECHNICIAN');
    await waitFor(() => expect(svc.users).toHaveBeenLastCalledWith({ page: 0, size: 20, role: 'TECHNICIAN' }));
    await userEvent.click(screen.getByRole('tab', { name: 'Audit log' }));
    expect(await screen.findByText('USER_CREATED')).toBeInTheDocument();
    await userEvent.selectOptions(screen.getByLabelText('Entity type'), 'USER');
    await waitFor(() => expect(svc.auditLogs).toHaveBeenLastCalledWith({ page: 0, size: 20, entityType: 'USER' }));
  });
});
