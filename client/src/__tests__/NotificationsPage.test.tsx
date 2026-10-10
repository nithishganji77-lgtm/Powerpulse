import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import NotificationsPage from '@/pages/NotificationsPage';
import { authService } from '@/services/authService';
import { notificationService } from '@/services/notificationService';
import { makeUser, renderWithProviders } from '@/test/renderWithProviders';
import { page } from '@/test/fixtures';
import { makeNotification } from '@/test/workflowFixtures';

vi.mock('@/services/authService', () => ({
  authService: { me: vi.fn(), csrf: vi.fn(), login: vi.fn(), logout: vi.fn() },
}));
vi.mock('@/services/notificationService', () => ({
  notificationService: { list: vi.fn(), unreadCount: vi.fn(), markRead: vi.fn(), markAllRead: vi.fn() },
}));

const svc = vi.mocked(notificationService);

describe('NotificationsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(authService.csrf).mockResolvedValue(undefined);
    vi.mocked(authService.me).mockResolvedValue(makeUser('OPERATOR'));
    svc.list.mockResolvedValue(
      page([
        makeNotification(),
        makeNotification({ id: 'n2', title: 'Task assigned', type: 'MAINTENANCE_ASSIGNED', relatedType: 'MAINTENANCE', relatedId: 'm9', read: true }),
      ]),
    );
  });

  it('marks unread items with a text label, not only color', async () => {
    renderWithProviders(<NotificationsPage />, { route: '/notifications', path: '/notifications' });
    await screen.findByText('Critical alert on PP-TX-004');
    expect(screen.getAllByText('Unread', { selector: 'span' })).toHaveLength(1);
    expect(screen.getByRole('button', { name: /^Unread: Critical alert on PP-TX-004/ })).toBeInTheDocument();
  });

  it('marks all as read', async () => {
    svc.markAllRead.mockResolvedValue(undefined);
    renderWithProviders(<NotificationsPage />, { route: '/notifications', path: '/notifications' });
    await screen.findByText('Critical alert on PP-TX-004');
    await userEvent.click(screen.getByRole('button', { name: /mark all read/i }));
    await waitFor(() => expect(svc.markAllRead).toHaveBeenCalledTimes(1));
    expect(await screen.findByText('All notifications marked as read')).toBeInTheDocument();
  });

  it('marks one as read', async () => {
    svc.markRead.mockResolvedValue(makeNotification({ read: true }));
    renderWithProviders(<NotificationsPage />, { route: '/notifications', path: '/notifications' });
    await userEvent.click(await screen.findByRole('button', { name: 'Mark "Critical alert on PP-TX-004" as read' }));
    await waitFor(() => expect(svc.markRead).toHaveBeenCalledWith('n1'));
  });

  it('navigates to the related resource and marks it read on click', async () => {
    svc.markRead.mockResolvedValue(makeNotification({ read: true }));
    renderWithProviders(<NotificationsPage />, { route: '/notifications', path: '/notifications' });
    await userEvent.click(await screen.findByRole('button', { name: /^Unread: Critical alert/ }));
    await waitFor(() => expect(svc.markRead).toHaveBeenCalledWith('n1'));
    expect(screen.getByTestId('location')).toHaveTextContent('/alerts?focus=a1');
  });

  it('filters unread and by type', async () => {
    renderWithProviders(<NotificationsPage />, { route: '/notifications', path: '/notifications' });
    await screen.findByText('Critical alert on PP-TX-004');
    await userEvent.selectOptions(screen.getByLabelText('Show'), 'unread');
    await userEvent.selectOptions(screen.getByLabelText('Type'), 'NEW_CRITICAL_ALERT');
    await waitFor(() => expect(svc.list).toHaveBeenLastCalledWith({ page: 0, size: 20, read: false, type: 'NEW_CRITICAL_ALERT' }));
  });
});
