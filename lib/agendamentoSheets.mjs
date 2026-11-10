import { JWT } from 'google-auth-library';
import { readFile } from 'node:fs/promises';

export const CABECALHOS = ['ID', 'Criado em', 'Sala', 'Data', 'Turno', 'Horário', 'Solicitante', 'Turma', 'Disciplina', 'Motivo da solicitação', 'Canal', 'Telefone', 'E-mail', 'Status', 'Motivo da decisão', 'Decidido por', 'Decidido em', 'Última notificação', 'Notificado em', 'Erro notificação'];
export const formatarDataHora = valor => {
  if (!valor) return '';
  const data = valor.toDate ? valor.toDate() : new Date(valor);
  return Number.isNaN(data.getTime()) ? '' : data.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', hour12: false, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).replace(',', '');
};

export async function criarClienteSheets({ permitirArquivo = false } = {}) {
  const json = process.env.GOOGLE_SHEETS_SERVICE_ACCOUNT_KEY || (permitirArquivo && process.env.GOOGLE_SHEETS_SERVICE_ACCOUNT_FILE ? await readFile(process.env.GOOGLE_SHEETS_SERVICE_ACCOUNT_FILE, 'utf8') : process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
  if (!json) throw new Error('Credencial Google Sheets não configurada');
  const credencial = JSON.parse(json);
  const auth = new JWT({ email: credencial.client_email, key: credencial.private_key, scopes: ['https://www.googleapis.com/auth/spreadsheets'] });
  const base = `https://sheets.googleapis.com/v4/spreadsheets/${process.env.AGENDAMENTO_SHEET_ID || '1FHPhjH8etzw5dJBl8gcYkHt3CRRSItq-uli8Rsr1KLI'}`;
  async function requisitar(caminho, method = 'GET', body) {
    const { token } = await auth.getAccessToken();
    const response = await fetch(base + caminho, { method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(30000) });
    if (!response.ok) throw new Error(`Google Sheets: HTTP ${response.status}`);
    return response.json();
  }
  const titulo = process.env.AGENDAMENTO_SHEET_TAB || (await requisitar('?fields=sheets.properties')).sheets.sort((a, b) => a.properties.index - b.properties.index)[0].properties.title;
  const aba = `'${titulo.replace(/'/g, "''")}'`;
  const caminho = faixa => `/values/${encodeURIComponent(`${aba}!${faixa}`)}`;
  return {
    ler: async faixa => (await requisitar(caminho(faixa))).values || [],
    escrever: (faixa, values) => requisitar(`${caminho(faixa)}?valueInputOption=RAW`, 'PUT', { values }),
    adicionar: values => requisitar(`${caminho('A:Q')}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`, 'POST', { values })
  };
}

export function montarLinhaAgendamento(id, a) {
  return [id, formatarDataHora(a.criadoEm), a.sala || '', a.data || '', a.turno || '', `${a.horarioInicio || ''} - ${a.horarioFim || ''}`, a.solicitante || '', a.turma || '', a.disciplina || '', a.motivo || '', a.canalNotificacao || (a.emailSolicitante ? 'email' : 'whatsapp'), a.telefoneSolicitante || '', a.emailSolicitante || '', ({ pendente: 'Pendente', aprovado: 'Aprovado', rejeitado: 'Negado' })[a.status] || 'Pendente', a.observacaoDecisao || a.motivoRejeicao || '', a.decididoPor || a.aprovadoPor || '', formatarDataHora(a.decididoEm || a.aprovadoEm)];
}

export async function sincronizarLinha(cliente, id, agendamento) {
  const ids = await cliente.ler('A:A');
  if (!ids.length) await cliente.escrever('A1:T1', [CABECALHOS]);
  const indice = ids.findIndex((linha, i) => i > 0 && linha[0] === id);
  const values = [montarLinhaAgendamento(id, agendamento)];
  // Apenas A:Q pertence ao sincronizador. R:T pertence ao notificador.
  if (indice >= 0) await cliente.escrever(`A${indice + 1}:Q${indice + 1}`, values);
  else await cliente.adicionar(values);
}
