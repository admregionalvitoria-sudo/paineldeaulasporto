import React, { useState, useEffect, useContext } from 'react';
import DashboardScreen from './components/DashboardScreen';
import AdminScreen from './components/AdminScreen';
import MediaScreen from './components/MediaScreen';
import AgendamentoScreen from './components/AgendamentoScreen';
import UserManagementScreen from './components/UserManagementScreen';
import AuditLogsScreen from './components/AuditLogsScreen';
import PainelClienteScreen from './components/PainelClienteScreen';
import OfflineScreen from './components/OfflineScreen';
import ProtectedRoute from './components/ProtectedRoute';
import { DataProvider, DataContext } from './context/DataContext';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';

export type AppView = 'dashboard' | 'admin' | 'midia' | 'agendamento' | 'usuarios' | 'logs' | 'painelcliente';

const AppContent: React.FC<{
  view: AppView;
  navigateTo: (target: AppView) => void;
}> = ({ view, navigateTo }) => {
  const context = useContext(DataContext);
  const isOffline = context?.isOffline ?? (!navigator.onLine);

  return (
    <div className="w-full h-full relative">
      {isOffline && <OfflineScreen onRetry={() => window.location.reload()} />}
      
      {view === 'admin' ? (
        <ProtectedRoute onReturnToDashboard={() => navigateTo('dashboard')} allowedRoles={['admin', 'coordenador']}>
          <AdminScreen 
            onReturnToDashboard={() => navigateTo('dashboard')}
            onNavigate={(route) => navigateTo(route as AppView)}
          />
        </ProtectedRoute>
      ) : view === 'midia' ? (
        <ProtectedRoute onReturnToDashboard={() => navigateTo('dashboard')} allowedRoles={['admin', 'comunicacao']}>
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
  const getInitialView = (): AppView => {
    const path = window.location.pathname.toLowerCase();
    const hash = window.location.hash.toLowerCase();

    if (path.startsWith('/admin') || hash === '#admin' || hash === '#/admin') {
      return 'admin';
    }
    if (path.startsWith('/midia') || hash === '#midia' || hash === '#/midia') {
      return 'midia';
    }
    if (path.startsWith('/usuario') || hash === '#usuarios' || hash === '#/usuarios') {
      return 'usuarios';
    }
    if (path.startsWith('/logs') || path.startsWith('/auditoria') || hash === '#logs' || hash === '#/logs') {
      return 'logs';
    }
    if (path.startsWith('/agendamento') || hash === '#agendamento' || hash === '#/agendamento') {
      return 'agendamento';
    }
    if (path.startsWith('/painelcliente') || path.startsWith('/cliente') || path.startsWith('/recepcao') || hash === '#painelcliente' || hash === '#/painelcliente') {
      return 'painelcliente';
    }
    return 'dashboard';
  };

  const [view, setView] = useState<AppView>(getInitialView);

  useEffect(() => {
    const handleLocationChange = () => {
      const path = window.location.pathname.toLowerCase();
      const hash = window.location.hash.toLowerCase();

      if (path.startsWith('/admin') || hash === '#admin' || hash === '#/admin') {
        setView('admin');
      } else if (path.startsWith('/midia') || hash === '#midia' || hash === '#/midia') {
        setView('midia');
      } else if (path.startsWith('/usuario') || hash === '#usuarios' || hash === '#/usuarios') {
        setView('usuarios');
      } else if (path.startsWith('/logs') || path.startsWith('/auditoria') || hash === '#logs' || hash === '#/logs') {
        setView('logs');
      } else if (path.startsWith('/agendamento') || hash === '#agendamento' || hash === '#/agendamento') {
        setView('agendamento');
      } else if (path.startsWith('/painelcliente') || path.startsWith('/cliente') || path.startsWith('/recepcao') || hash === '#painelcliente' || hash === '#/painelcliente') {
        setView('painelcliente');
      } else {
        setView('dashboard');
      }
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
      midia: '/midia',
      usuarios: '/usuarios',
      logs: '/logs',
      agendamento: '/agendamento',
      painelcliente: '/painelcliente'
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
