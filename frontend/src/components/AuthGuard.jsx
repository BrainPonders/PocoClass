import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { auth } from '@/api/auth';

export default function AuthGuard({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isChecking, setIsChecking] = useState(true);
  const [setupCompleted, setSetupCompleted] = useState(false);

  useEffect(() => {
    checkAuth();
  }, [location.pathname]);

  const checkAuth = async () => {
    try {
      const setupStatus = await auth.checkSetupStatus();
      setSetupCompleted(setupStatus.setupCompleted);

      if (!setupStatus.setupCompleted) {
        if (location.pathname !== '/setup') {
          navigate('/setup', { replace: true });
        }
        setIsChecking(false);
        return;
      }

      const isAuthenticated = auth.isAuthenticated();
      
      if (!isAuthenticated) {
        if (location.pathname !== '/login' && location.pathname !== '/setup') {
          navigate('/login', { replace: true });
        }
        setIsChecking(false);
        return;
      }

      const isValid = await auth.validateSession();
      if (!isValid && location.pathname !== '/login') {
        navigate('/login', { replace: true });
        setIsChecking(false);
        return;
      }

      if ((location.pathname === '/login' || location.pathname === '/setup') && isValid) {
        navigate('/', { replace: true });
      }

      setIsChecking(false);
    } catch (error) {
      console.error('Auth check error:', error);
      setIsChecking(false);
    }
  };

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--app-bg)' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{ borderColor: 'var(--app-primary)' }}></div>
          <p style={{ color: 'var(--app-text-secondary)' }}>Loading...</p>
        </div>
      </div>
    );
  }

  return children;
}
