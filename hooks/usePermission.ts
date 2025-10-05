import { useAuth } from '@/contexts/AuthContext';

type UserRole = 'HOD' | 'STAFF' | null;

export function usePermission() {
  const { userRole, hasPermission } = useAuth();

  const requireHOD = () => {
    return hasPermission('HOD');
  };

  const requireStaff = () => {
    return hasPermission('STAFF') || hasPermission('HOD');
  };

  const canAccess = (roles: UserRole[]) => {
    return roles.some(role => hasPermission(role));
  };

  return {
    userRole,
    requireHOD,
    requireStaff,
    canAccess,
    isHOD: userRole === 'HOD',
    isStaff: userRole === 'STAFF'
  };
}