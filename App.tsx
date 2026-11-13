import React, { Suspense, lazy, useState, useEffect, useContext } from 'react';
import { Loader2 } from 'lucide-react';
import DashboardScreen from './components/DashboardScreen';
import OfflineScreen from './components/OfflineScreen';
import ProtectedRoute from './components/ProtectedRoute';
import GestaoShell, { AdminTab, ItemAtivo } from './components/GestaoShell';
import DialogosHost from './components/ui/Dialogos';
import { DataProvider, DataContext } from './context/DataContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { Capacidade, papeisCom, pode, telaInicial } from './utils/permissoes';

import { AppView, resolveAppView } from './utils/routes';
export type { AppView } from './utils/routes';

// O painel das TVs fica no pacote inicial; as demais telas carregam só quando abertas.
const AdminScreen = lazy(() => import('./components/AdminScreen'));
const AdministrativoScreen = lazy(() => import('./components/AdministrativoScreen'));
const MediaScreen = lazy(() => import('./components/MediaScreen'));
const AgendamentoScreen = lazy(() => import('./components/AgendamentoScreen'));
const UserManagementScreen = lazy(() => import('./components/UserManagementScreen'));
const AuditLogsScreen = lazy(() => import('./components/AuditLogsScreen'));
const PainelClienteScreen = lazy(() => import('./components/PainelClienteScreen'));
const PainelLimpezaScreen = lazy(() => import('./components/PainelLimpezaScreen'));

const TITULOS: Record<AppView, string> = {
  dashboard: 'Painel de Aulas — SENAI Porto',
  admin: 'Gestão — Painel de Aulas',
  administrativo: 'Prioridades e agenda — Painel de Aulas',
  midia: 'Mídias e TV — Painel de Aulas',
  usuarios: 'Usuários — Painel de Aulas',
  logs: 'Auditoria — Painel de Aulas',
  agendamento: 'Agendamento de salas — SENAI Porto',
  painelcliente: 'Painel do cliente — SENAI Porto',
  limpeza: 'Limpeza — Painel de Aulas',
};

const Carregando: React.FC = () => (
  <div className="flex min-h-screen w-full items-center justify-center bg-[#EDF1F6]" role="status" aria-label="Carregando">
    <Loader2 className="h-7 w-7 animate-spin text-[#F4901E]" />
  </div>
);

const AppContent: React.FC<{
  view: AppView;
  navigateTo: (target: AppView) => void;
}> = ({ view, navigateTo }) => {
  const context = useContext(DataContext);
  const { usuarioAtual, loading } = useAuth();
  const isOffline = context?.isOffline ?? (!navigator.onLine);
  const [abaAdmin, setAbaAdmin] = useState<AdminTab>('aulas');

  useEffect(() => { document.title = TITULOS[view]; }, [view]);

  // Quem só cuida de mídia e abre /admin vai direto para a sua área.
  useEffect(() => {
    if (loading || !usuarioAtual || view !== 'admin') return;
    if (!pode(usuarioAtual, 'cronograma') && telaInicial(usuarioAtual) === 'midia') navigateTo('midia');
  }, [loading, usuarioAtual, view]);

  const irPara = (rota: string) => navigateTo(rota as AppView);
  const voltarAoPainel = () => navigateTo('dashboard');
  const abrirAba = (aba: AdminTab) => { setAbaAdmin(aba); navigateTo('admin'); };

  const gestao = (ativo: ItemAtivo, capacidade: Capacidade, conteudo: React.ReactNode) => (
    <ProtectedRoute onReturnToDashboard={voltarAoPainel} allowedRoles={papeisCom(capacidade)}>
      <GestaoShell ativo={ativo} onAba={abrirAba} onNavegar={irPara}>
        <Suspense fallback={<Carregando />}>{conteudo}</Suspense>
      </GestaoShell>
    </ProtectedRoute>
  );

  return (
    <div className="w-full h-full relative">
      {isOffline && <OfflineScreen onRetry={() => window.location.reload()} />}
      <Suspense fallback={<Carregando />}>
        {view === 'administrativo' ? (
          gestao('administrativo', 'administrativo', <AdministrativoScreen onNavigate={irPara} />)
        ) : view === 'admin' ? (
          gestao(abaAdmin, 'cronograma', <AdminScreen aba={abaAdmin} onAba={setAbaAdmin} onNavigate={irPara} />)
        ) : view === 'midia' ? (
          gestao('midia', 'midia', <MediaScreen onBack={() => navigateTo(telaInicial(usuarioAtual) === 'admin' ? 'admin' : 'dashboard')} />)
        ) : view === 'usuarios' ? (
          gestao('usuarios', 'usuarios', <UserManagementScreen onBack={() => navigateTo('admin')} />)
        ) : view === 'logs' ? (
          gestao('logs', 'logs', <AuditLogsScreen onBack={() => navigateTo('admin')} />)
        ) : view === 'agendamento' ? (
          <AgendamentoScreen onReturnToDashboard={voltarAoPainel} onGoToAdmin={() => navigateTo('admin')} />
        ) : view === 'painelcliente' ? (
          <PainelClienteScreen onReturnToDashboard={voltarAoPainel} />
        ) : view === 'limpeza' ? (
          <PainelLimpezaScreen onReturnToDashboard={voltarAoPainel} onGoToAdmin={() => navigateTo('admin')} />
        ) : (
          <DashboardScreen onAdminClick={() => navigateTo('admin')} onAgendamentoClick={() => navigateTo('agendamento')} />
        )}
      </Suspense>
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
        {/* Cada tela baixa só o período de aulas que usa: é o que mais pesa na cota do banco. */}
        <DataProvider janela={view === 'dashboard' || view === 'painelcliente' ? 'painel' : view === 'limpeza' ? 'limpeza' : 'completa'}>
          <AppContent view={view} navigateTo={navigateTo} />
          <DialogosHost />
        </DataProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
