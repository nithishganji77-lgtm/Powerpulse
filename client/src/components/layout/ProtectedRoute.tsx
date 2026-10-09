// PLACEHOLDER — replaced during implementation (owner: frontend agent).
import { Outlet } from 'react-router-dom';
import type { Role } from '@/types/api';

export function ProtectedRoute(_props: { roles?: Role[] }) {
  return <Outlet />;
}
