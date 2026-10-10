import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import DashboardPage from '@/pages/DashboardPage';
import { authService } from '@/services/authService';
import { dashboardService } from '@/services/dashboardService';
import { transformerService } from '@/services/transformerService';
import { simulationService } from '@/services/simulationService';
import { ApiError } from '@/services/apiClient';
import { makeUser, renderWithProviders } from '@/test/renderWithProviders';
import { makeSimStatus, makeSummary, makeTransformer } from '@/test/fixtures';

vi.mock('@/services/authService', () => ({
  authService: { me: vi.fn(), csrf: vi.fn(), login: vi.fn(), logout: vi.fn() },
}));
vi.mock('@/services/dashboardService', () => ({
  dashboardService: { summary: vi.fn(), trends: vi.fn(), healthDistribution: vi.fn(), faultFrequency: vi.fn() },
}));
vi.mock('@/services/transformerService', () => ({
  transformerService: { all: vi.fn(), locations: vi.fn(), list: vi.fn() },
}));
vi.mock('@/services/simulationService', () => ({
  simulationService: { status: vi.fn(), start: vi.fn(), pause: vi.fn(), reset: vi.fn(), runScenario: vi.fn() },
}));

const dash = vi.mocked(dashboardService);

function tile(label: string) {
  const el = document.querySelector(`[data-stat="${label}"]`);
  if (!el) throw new Error(`No stat tile ${label}`);
  return el as HTMLElement;
}

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(authService.csrf).mockResolvedValue(undefined);
    vi.mocked(authService.me).mockResolvedValue(makeUser('OPERATOR'));
    dash.trends.mockResolvedValue([]);
    dash.healthDistribution.mockResolvedValue([]);
    dash.faultFrequency.mockResolvedValue([]);
    vi.mocked(transformerService.all).mockResolvedValue([makeTransformer()]);
    vi.mocked(transformerService.locations).mockResolvedValue(['Riverside', 'Harbour']);
    vi.mocked(simulationService.status).mockResolvedValue(makeSimStatus());
  });

  it('renders KPI values from the summary API (not hardcoded)', async () => {
    dash.summary.mockResolvedValue(makeSummary());
    renderWithProviders(<DashboardPage />, { route: '/dashboard', path: '/dashboard' });

    await screen.findByText('37');
    expect(within(tile('Healthy')).getByText('21')).toBeInTheDocument();
    expect(within(tile('Warning')).getByText('9')).toBeInTheDocument();
    expect(within(tile('Critical')).getByText('4')).toBeInTheDocument();
    expect(within(tile('Offline')).getByText('3')).toBeInTheDocument();
    expect(within(tile('Network health')).getByText('73')).toBeInTheDocument();
    expect(within(tile('Total load')).getByText('4,321')).toBeInTheDocument();
    expect(within(tile('Active alerts')).getByText('17')).toBeInTheDocument();
    expect(within(tile('Active alerts')).getByText('5 critical')).toBeInTheDocument();
    expect(within(tile('Pending maintenance')).getByText('2 overdue')).toBeInTheDocument();
  });

  it('re-renders different numbers for a different response', async () => {
    dash.summary.mockResolvedValue(makeSummary({ totalTransformers: 58, networkHealth: null }));
    renderWithProviders(<DashboardPage />, { route: '/dashboard', path: '/dashboard' });
    await screen.findByText('58');
    expect(screen.queryByText('37')).not.toBeInTheDocument();
    expect(within(tile('Network health')).getByText('—')).toBeInTheDocument();
  });

  it('passes URL filters to the summary query', async () => {
    dash.summary.mockResolvedValue(makeSummary());
    renderWithProviders(<DashboardPage />, { route: '/dashboard?location=Harbour&status=CRITICAL', path: '/dashboard' });
    await screen.findByText('37');
    expect(dash.summary).toHaveBeenCalledWith({ location: 'Harbour', status: 'CRITICAL' });
  });

  it('shows loading skeletons while the summary is pending', async () => {
    dash.summary.mockReturnValue(new Promise(() => {}));
    renderWithProviders(<DashboardPage />, { route: '/dashboard', path: '/dashboard' });
    const kpis = await screen.findByRole('region', { name: 'Key metrics' });
    expect(kpis.querySelector('[aria-busy="true"]')).not.toBeNull();
    expect(screen.queryByText('37')).not.toBeInTheDocument();
  });

  it('shows an error with Retry that refetches', async () => {
    dash.summary.mockRejectedValueOnce(new ApiError(500, 'INTERNAL_ERROR', 'boom')).mockResolvedValue(makeSummary());
    renderWithProviders(<DashboardPage />, { route: '/dashboard', path: '/dashboard' });
    expect(await screen.findByText('Could not load the network summary')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /retry/i }));
    await waitFor(() => expect(screen.getByText('37')).toBeInTheDocument());
    expect(dash.summary).toHaveBeenCalledTimes(2);
  });
});
