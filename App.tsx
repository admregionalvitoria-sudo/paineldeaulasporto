import React, { useState, useEffect, useContext } from 'react';
import DashboardScreen from './components/DashboardScreen';
import AdministrativoScreen from './components/AdministrativoScreen';
import AdminScreen from './components/AdminScreen';
import MediaScreen from './components/MediaScreen';
import AgendamentoScreen from './components/AgendamentoScreen';
import UserManagementScreen from './components/UserManagementScreen';
import AuditLogsScreen from './components/AuditLogsScreen';
import PainelClienteScreen from './components/PainelClienteScreen';
import PainelLimpezaScreen from './components/PainelLimpezaScreen';
import OfflineScreen from './components/OfflineScreen';
import ProtectedRoute from './components/ProtectedRoute';
import { DataProvider, DataContext } from './context/DataContext';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';

import { AppView, resolveAppView } from './utils/routes';
export type { AppView } from './utils/routes';

const AppContent: React.FC<{
  view: AppView;
  navigateTo: (target: AppView) => void;
}> = ({ view, navigateTo }) => {
  const context = useContext(DataContext);
  const isOffline = context?.isOffline ?? (!navigator.onLine);

  return (
    <div className="w-full h-full relative">
      {isOffline && <OfflineScreen onRetry={() => window.location.reload()} />}
      
      {view === 'administrativo' ? (
        <ProtectedRoute onReturnToDashboard={() => navigateTo('dashboard')} allowedRoles={['admin', 'coordenador']}>
          <AdministrativoScreen onNavigate={route => navigateTo(route as AppView)} />
        </ProtectedRoute>
      ) : view === 'admin' ? (
        <ProtectedRoute onReturnToDashboard={() => navigateTo('dashboard')} allowedRoles={['admin', 'coordenador']}>
          <AdminScreen 
            onReturnToDashboard={() => navigateTo('dashboard')}
            onNavigate={(route) => navigateTo(route as AppView)}
          />
        </ProtectedRoute>
      ) : view === 'midia' ? (
        <ProtectedRoute onReturnToDashboard={() => navigateTo('dashboard')} allowedRoles={['admin', 'comunicacao', 'midia']}>
          <MediaScreen onBack={() => navigateTo('admin')} />
        </ProtectedRoute>
      ) : view === 'usuarios' ? (
        <ProtectedRoute onReturnToDashboard={() => navigateTo('dashboard')} allowedRoles={['admin']}>
          <UserManagementScreen onBack={() => navigateTo('admin')} />
        </ProtectedRoute>
      ) : view === 'logs' ? (
        <ProtectedRoute onReturnToDashboard={() => navigateTo('dashboard')} allowedRoles={['admin']}>
          <AuditLogsScreen onBack={() => navigateTo('admin')} />
        </ProtectedRoute>
      ) : view === 'agendamento' ? (
        <AgendamentoScreen 
          onReturnToDashboard={() => navigateTo('dashboard')} 
          onGoToAdmin={() => navigateTo('admin')} 
        />
      ) : view === 'painelcliente' ? (
        <PainelClienteScreen onReturnToDashboard={() => navigateTo('dashboard')} />
      ) : view === 'limpeza' ? (
        <PainelLimpezaScreen 
          onReturnToDashboard={() => navigateTo('dashboard')} 
          onGoToAdmin={() => navigateTo('admin')}
        />
      ) : (
        <DashboardScreen 
          onAdminClick={() => navigateTo('admin')} 
          onAgendamentoClick={() => navigateTo('agendamento')}
        />
      )}
    </div>
  );
};

function App() {
  const getInitialView = () => resolveAppView(window.location.pathname, window.location.hash);

  const [view, setView] = useState<AppView>(getInitialView);

  useEffect(() => {
    const handleLocationChange = () => {
      setView(getInitialView());
    };

    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('hashchange', handleLocationChange);
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('hashchange', handleLocationChange);
    };
  }, []);

  const navigateTo = (target: AppView) => {
    const routeMap: Record<AppView, string> = {
      dashboard: '/',
      admin: '/admin',
      administrativo: '/administrativo',
      midia: '/midia',
      usuarios: '/usuarios',
      logs: '/logs',
      agendamento: '/agendamento',
      painelcliente: '/painelcliente',
      limpeza: '/limpeza'
    };

    const targetPath = routeMap[target] || '/';
    if (window.location.pathname !== targetPath) {
      window.history.pushState({}, '', targetPath);
    }
    setView(target);
  };

  return (
    <ThemeProvider>
      <AuthProvider>
        <DataProvider>
          <AppContent 
            view={view} 
            navigateTo={navigateTo}
          />
        </DataProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
