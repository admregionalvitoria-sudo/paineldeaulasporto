import React, { useState, useEffect, useContext } from 'react';
import DashboardScreen from './components/DashboardScreen';
import AdminScreen from './components/AdminScreen';
import AgendamentoScreen from './components/AgendamentoScreen';
import LoginScreen from './components/LoginScreen';
import MediaScreen from './components/MediaScreen';
import AuditLogsScreen from './components/AuditLogsScreen';
import UserManagementScreen from './components/UserManagementScreen';
import OfflineScreen from './components/OfflineScreen';
import ProtectedRoute from './components/ProtectedRoute';
import { DataProvider, DataContext } from './context/DataContext';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';

export type AppView = 'dashboard' | 'admin' | 'agendamento' | 'login' | 'midia' | 'auditoria' | 'usuarios';

const AppContent: React.FC<{
  view: AppView;
  setView: (v: AppView) => void;
  navigate: (v: AppView) => void;
}> = ({ view, navigate }) => {
  const context = useContext(DataContext);
  const isOffline = context?.isOffline ?? (!navigator.onLine);

  return (
    <div className="w-full h-full relative">
      {isOffline && <OfflineScreen onRetry={() => window.location.reload()} />}

      {view === 'login' ? (
        <LoginScreen 
          onSuccess={() => navigate('admin')} 
          onReturnToDashboard={() => navigate('dashboard')} 
        />
      ) : view === 'midia' ? (
        <ProtectedRoute allowedRoles={['midia', 'admin', 'super_admin']} onReturnToDashboard={() => navigate('dashboard')}>
          <MediaScreen onBack={() => navigate('admin')} />
        </ProtectedRoute>
      ) : view === 'auditoria' ? (
        <ProtectedRoute allowedRoles={['admin', 'super_admin']} onReturnToDashboard={() => navigate('dashboard')}>
          <AuditLogsScreen onBack={() => navigate('admin')} />
        </ProtectedRoute>
      ) : view === 'usuarios' ? (
        <ProtectedRoute allowedRoles={['super_admin']} onReturnToDashboard={() => navigate('dashboard')}>
          <UserManagementScreen onBack={() => navigate('admin')} />
        </ProtectedRoute>
      ) : view === 'admin' ? (
        <ProtectedRoute allowedRoles={['admin', 'super_admin']} onReturnToDashboard={() => navigate('dashboard')}>
          <AdminScreen 
            onReturnToDashboard={() => navigate('dashboard')} 
            onGoToMedia={() => navigate('midia')}
            onGoToAudit={() => navigate('auditoria')}
            onGoToUsers={() => navigate('usuarios')}
          />
        </ProtectedRoute>
      ) : view === 'agendamento' ? (
        <AgendamentoScreen 
          onReturnToDashboard={() => navigate('dashboard')} 
          onGoToAdmin={() => navigate('admin')} 
        />
      ) : (
        <DashboardScreen 
          onAdminClick={() => navigate('admin')} 
          onAgendamentoClick={() => navigate('agendamento')}
        />
      )}
    </div>
  );
};

function App() {
  const getViewFromUrl = (): AppView => {
    const path = window.location.pathname;
    const hash = window.location.hash;

    if (path.startsWith('/admin') || hash.includes('admin')) return 'admin';
    if (path.startsWith('/login') || hash.includes('login')) return 'login';
    if (path.startsWith('/midia') || hash.includes('midia')) return 'midia';
    if (path.startsWith('/auditoria') || hash.includes('auditoria')) return 'auditoria';
    if (path.startsWith('/usuarios') || hash.includes('usuarios')) return 'usuarios';
    if (path.startsWith('/agendamento') || hash.includes('agendamento')) return 'agendamento';
    return 'dashboard';
  };

  const [view, setView] = useState<AppView>(getViewFromUrl);

  useEffect(() => {
    const handleLocationChange = () => {
      setView(getViewFromUrl());
    };

    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('hashchange', handleLocationChange);
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('hashchange', handleLocationChange);
    };
  }, []);

  const navigate = (targetView: AppView) => {
    const targetPath = targetView === 'dashboard' ? '/' : `/${targetView}`;
    if (window.location.pathname !== targetPath) {
      window.history.pushState({}, '', targetPath);
    }
    setView(targetView);
  };

  return (
    <AuthProvider>
      <ThemeProvider>
        <DataProvider>
          <AppContent 
            view={view} 
            setView={setView} 
            navigate={navigate} 
          />
        </DataProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;
