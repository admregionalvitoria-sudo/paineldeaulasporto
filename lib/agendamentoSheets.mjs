import { whatsappAutorizado, normalizarTelefone } from '../utils/notificacaoAgendamento.mjs';
import { JWT } from 'google-auth-library';

export const CABECALHOS = ['ID', 'Nome', 'Telefone', 'E-mail', 'Status', 'Motivo', 'Sala / Data'];

export async function criarClienteSheets() {
  const json = process.env.GOOGLE_SHEETS_SERVICE_ACCOUNT_KEY || process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
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
    adicionar: values => requisitar(`${caminho('A:G')}:append?valueInputOption=RAW&insertDataOption=OVERWRITE`, 'POST', { values })
  };
}

export function montarLinhaAgendamento(id, a) {
  const status = ({ pendente: 'Pendente', aprovado: 'Aprovado', rejeitado: 'Negado' })[a.status] || 'Pendente';
  const motivo = status === 'Negado' ? a.motivoRejeicao || a.observacaoDecisao || ''
    : status === 'Aprovado' ? a.observacaoDecisao || '' : '';
  return [
    id,
    a.solicitante || '',
    whatsappAutorizado(a) ? normalizarTelefone(a.telefoneSolicitante) : '',
    a.emailSolicitante || '',
    status,
    motivo,
    `${a.sala || ''} — ${a.data || ''} (${a.turno || ''} ${a.horarioInicio || ''}-${a.horarioFim || ''})`
  ];
}

export function validarCabecalho(cabecalho = []) {
  const valores = cabecalho.slice(0, CABECALHOS.length);
  if (!valores.some(valor => valor !== '' && valor != null)) return false;
  if (CABECALHOS.some((valor, i) => valor !== valores[i])) throw new Error('Cabeçalho da planilha diferente do esperado');
  return true;
}

export async function garantirCabecalho(cliente) {
  const [cabecalho] = await cliente.ler('A1:G1');
  if (!validarCabecalho(cabecalho)) await cliente.escrever('A1:G1', [CABECALHOS]);
}

export async function sincronizarLinha(cliente, id, agendamento) {
  await garantirCabecalho(cliente);
  const ids = await cliente.ler('A:A');
  const indice = ids.findIndex((linha, i) => i > 0 && linha[0] === id);
  const values = [montarLinhaAgendamento(id, agendamento)];
  // H em diante pertence ao agente externo; não inserir nem deslocar linhas.
  if (indice < 0) await cliente.adicionar(values);
  else await cliente.escrever(`A${indice + 1}:G${indice + 1}`, values);
}
