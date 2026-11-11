export type AppView = 'dashboard' | 'administrativo' | 'admin' | 'midia' | 'agendamento' | 'usuarios' | 'logs' | 'painelcliente' | 'limpeza';

export function resolveAppView(pathname: string, locationHash = ''): AppView {
    const path = pathname.toLowerCase();
    const hash = locationHash.toLowerCase();

    if (path === '/administrativo' || path === '/administrativo/' || hash === '#administrativo' || hash === '#/administrativo') return 'administrativo';
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
    if (path.startsWith('/limpeza') || hash === '#limpeza' || hash === '#/limpeza') {
      return 'limpeza';
    }
    return 'dashboard';
  }
