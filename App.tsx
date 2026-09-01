
import React, { useState, useEffect, useContext } from 'react';
import DashboardScreen from './components/DashboardScreen';
import AdminScreen from './components/AdminScreen';
import AgendamentoScreen from './components/AgendamentoScreen';
import OfflineScreen from './components/OfflineScreen';
import { DataProvider, DataContext } from './context/DataContext';
import { ThemeProvider } from './context/ThemeContext';

export type AppView = 'dashboard' | 'admin' | 'agendamento';

const AppContent: React.FC<{
  view: AppView;
  showAdmin: () => void;
  showDashboard: () => void;
  showAgendamento: () => void;
}> = ({ view, showAdmin, showDashboard, showAgendamento }) => {
  const context = useContext(DataContext);
  const isOffline = context?.isOffline ?? (!navigator.onLine);

  return (
    <div className="w-full h-full relative">
      {isOffline && <OfflineScreen onRetry={() => window.location.reload()} />}
      {view === 'admin' ? (
        <AdminScreen onReturnToDashboard={showDashboard} />
      ) : view === 'agendamento' ? (
        <AgendamentoScreen 
          onReturnToDashboard={showDashboard} 
          onGoToAdmin={showAdmin} 
        />
      ) : (
        <DashboardScreen 
          onAdminClick={showAdmin} 
          onAgendamentoClick={showAgendamento}
        />
      )}
    </div>
  );
};

function App() {
  const getInitialView = (): AppView => {
    const path = window.location.pathname;
    const hash = window.location.hash;
    if (path.startsWith('/admin') || hash === '#admin' || hash === '#/admin') {
      return 'admin';
    }
    if (path.startsWith('/agendamento') || hash === '#agendamento' || hash === '#/agendamento') {
      return 'agendamento';
    }
    return 'dashboard';
  };

  const [view, setView] = useState<AppView>(getInitialView);

  useEffect(() => {
    const handleLocationChange = () => {
      const path = window.location.pathname;
      const hash = window.location.hash;
      if (path.startsWith('/admin') || hash === '#admin' || hash === '#/admin') {
        setView('admin');
      } else if (path.startsWith('/agendamento') || hash === '#agendamento' || hash === '#/agendamento') {
        setView('agendamento');
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

  const showAdmin = () => {
    if (window.location.pathname !== '/admin') {
      window.history.pushState({}, '', '/admin');
    }
    setView('admin');
  };

  const showDashboard = () => {
    if (window.location.pathname !== '/') {
      window.history.pushState({}, '', '/');
    }
    setView('dashboard');
  };

  const showAgendamento = () => {
    if (window.location.pathname !== '/agendamento') {
      window.history.pushState({}, '', '/agendamento');
    }
    setView('agendamento');
  };

  return (
    <ThemeProvider>
      <DataProvider>
        <AppContent 
          view={view} 
          showAdmin={showAdmin} 
          showDashboard={showDashboard} 
          showAgendamento={showAgendamento}
        />
      </DataProvider>
    </ThemeProvider>
  );
}

export default App;
