export function normalizarTelefone(valor) {
  let numero = String(valor || '').replace(/\D/g, '');
  if ((numero.length === 12 || numero.length === 13) && numero.startsWith('55')) numero = numero.slice(2);
  return /^\d{10,11}$/.test(numero) ? `55${numero}` : '';
}
export function mascaraTelefone(valor) {
  const n = String(valor || '').replace(/\D/g, '').slice(0, 11);
  return n ? `(${n.slice(0, 2)}${n.length >= 2 ? ') ' : ''}${n.slice(2, n.length > 10 ? 7 : 6)}${n.length > 6 ? '-' : ''}${n.slice(n.length > 10 ? 7 : 6)}` : '';
}
export const mascararContato = valor => `***${String(valor || '').slice(-4)}`;
export const emailValido = valor => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(valor || '').trim());
export const precisaNotificar = linha => ['Pendente', 'Aprovado', 'Negado'].includes(linha[13]) && linha[13] !== linha[17];
export function montarMensagem(linha) {
  const status = linha[13];
  const abertura = status === 'Pendente' ? 'Recebemos sua solicitação. Aguarda análise do gestor.' : status === 'Aprovado' ? 'Sua reserva foi APROVADA.' : 'Sua reserva foi NEGADA.';
  return ['SENAI Porto — Agendamento de Ambientes', '', abertura, `Sala: ${linha[2]}`, `Data: ${linha[3]}`, `Turno: ${linha[4]}`, `Horário: ${linha[5]}`,
    status === 'Negado' ? `Motivo: ${linha[14] || 'Motivo não informado pelo gestor.'}` : status === 'Aprovado' && linha[14] ? `Observação do gestor: ${linha[14]}` : ''].filter((v, i) => v || i === 1).join('\n');
}
