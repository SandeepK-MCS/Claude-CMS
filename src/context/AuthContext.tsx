import React, { createContext, useContext, useState, useEffect } from 'react';
import { AuthenticatedUserSession, BusinessRole } from '../types/security';

interface AuthContextType {
  session: AuthenticatedUserSession | null;
  activeRole: BusinessRole;
  switchRole: (role: BusinessRole) => void;
  setSession: (session: AuthenticatedUserSession | null) => void;
  logout: () => void;
}

const DEFAULT_SUPER_ADMIN_SESSION: AuthenticatedUserSession = {
  userId: 'usr_sa1',
  name: 'Sunita Rao',
  email: 'sunita.admin@crm.internal',
  role: 'super_admin',
  roleId: 6,
  branch: 'Hyderabad - Head Office',
  token: 'dev-bearer-token-sa1',
  issuedAt: new Date().toISOString(),
  expiresAt: new Date(Date.now() + 86400000).toISOString()
};

const AuthContext = createContext<AuthContextType>({
  session: DEFAULT_SUPER_ADMIN_SESSION,
  activeRole: 'super_admin',
  switchRole: () => {},
  setSession: () => {},
  logout: () => {}
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSessionState] = useState<AuthenticatedUserSession | null>(() => {
    try {
      const stored = localStorage.getItem('crm_active_session');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // ignore
    }
    return DEFAULT_SUPER_ADMIN_SESSION;
  });

  const [activeRole, setActiveRole] = useState<BusinessRole>(session?.role || 'super_admin');

  useEffect(() => {
    if (session) {
      localStorage.setItem('crm_active_session', JSON.stringify(session));
      setActiveRole(session.role);
    } else {
      localStorage.removeItem('crm_active_session');
    }
  }, [session]);

  const switchRole = (newRole: BusinessRole) => {
    setActiveRole(newRole);
    if (session) {
      const updated: AuthenticatedUserSession = {
        ...session,
        role: newRole,
        roleId: newRole === 'super_admin' ? 6 : newRole === 'master_super_admin' ? 99 : newRole === 'branch_manager' ? 2 : newRole === 'counselor' ? 4 : 17
      };
      setSessionState(updated);
    }
  };

  const setSession = (newSession: AuthenticatedUserSession | null) => {
    setSessionState(newSession);
    if (newSession?.role) {
      setActiveRole(newSession.role);
    }
  };

  const logout = () => {
    setSessionState(null);
    localStorage.removeItem('crm_active_session');
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        activeRole,
        switchRole,
        setSession,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
