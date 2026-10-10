import {
  Bell,
  BarChart3,
  Boxes,
  ClipboardList,
  History,
  LayoutDashboard,
  Settings,
  Siren,
  Users,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import type { Role } from '@/types/api';

export interface NavItem {
  to: string;
  label: string;
  Icon: LucideIcon;
  /** Mirrors the ProtectedRoute roles in App.tsx. Undefined = everyone. */
  roles?: Role[];
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', Icon: LayoutDashboard },
  { to: '/grid', label: '3D Grid', Icon: Boxes },
  { to: '/transformers', label: 'Transformers', Icon: Zap },
  { to: '/alerts', label: 'Alerts', Icon: Siren },
  { to: '/maintenance', label: 'Maintenance', Icon: ClipboardList },
  { to: '/fault-history', label: 'Fault History', Icon: History },
  { to: '/notifications', label: 'Notifications', Icon: Bell },
  { to: '/reports', label: 'Reports', Icon: BarChart3, roles: ['ADMIN', 'ENGINEER', 'OPERATOR'] },
  { to: '/settings', label: 'Settings', Icon: Settings, roles: ['ADMIN', 'ENGINEER'] },
  { to: '/admin/users', label: 'Users', Icon: Users, roles: ['ADMIN'] },
];

/** Page title for the top bar, derived from the route. */
export function titleForPath(pathname: string): string {
  if (/^\/transformers\/[^/]+/.test(pathname)) return 'Transformer details';
  const item = NAV_ITEMS.find((n) => pathname === n.to || pathname.startsWith(`${n.to}/`));
  return item?.label ?? 'PowerPulse';
}
