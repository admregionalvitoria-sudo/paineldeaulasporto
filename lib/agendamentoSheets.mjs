import { whatsappAutorizado, normalizarTelefone } from '../utils/notificacaoAgendamento.mjs';

export const CABECALHOS = ['ID', 'Nome', 'Telefone', 'E-mail', 'Status', 'Motivo', 'Sala / Data'];

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

export async function enviarParaPlanilha(id, agendamento) {
  const url = process.env.SHEETS_WEBHOOK_URL;
  const token = process.env.SHEETS_WEBHOOK_TOKEN;
  if (!url || !token) throw new Error('Planilha não configurada (SHEETS_WEBHOOK_URL/SHEETS_WEBHOOK_TOKEN)');
  const valores = montarLinhaAgendamento(id, agendamento);
  const linha = Object.fromEntries(CABECALHOS.map((cabecalho, i) => [cabecalho, valores[i]]));
  const resposta = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, linha }),
    signal: AbortSignal.timeout(30000)
  });
  const texto = await resposta.text();
  if (resposta.status === 403 || /text\/html/i.test(resposta.headers.get('content-type') || '') || /^\s*</.test(texto)) {
    throw new Error('Planilha: acesso negado ao Web App (verifique implantação "Qualquer pessoa")');
  }
  let retorno;
  try {
    retorno = JSON.parse(texto);
  } catch {
    throw new Error('Planilha: resposta não-JSON do Web App');
  }
  if (retorno?.ok !== true) {
    const erro = typeof retorno?.erro === 'string' && retorno.erro ? retorno.erro : 'resposta inválida do Web App';
    // O script pode ecoar dados recebidos; nunca propagar o segredo ao cliente.
    throw new Error(`Planilha: ${erro.replaceAll(token, '[segredo]')}`);
  }
  if (!resposta.ok) throw new Error(`Planilha: HTTP ${resposta.status}`);
  return retorno;
}
