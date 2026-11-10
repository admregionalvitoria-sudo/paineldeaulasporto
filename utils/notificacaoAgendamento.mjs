export function normalizarTelefone(valor) {
  let numero = String(valor || '').replace(/\D/g, '');
  if ((numero.length === 12 || numero.length === 13) && numero.startsWith('55')) numero = numero.slice(2);
  return /^\d{10,11}$/.test(numero) ? `55${numero}` : '';
}
export function mascaraTelefone(valor) {
  const n = String(valor || '').replace(/\D/g, '').slice(0, 11);
  return n ? `(${n.slice(0, 2)}${n.length >= 2 ? ') ' : ''}${n.slice(2, n.length > 10 ? 7 : 6)}${n.length > 6 ? '-' : ''}${n.slice(n.length > 10 ? 7 : 6)}` : '';
}
export const emailValido = valor => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(valor || '').trim());
// O campo explícito prevalece sobre o canal legado, inclusive quando falso.
export const whatsappAutorizado = a => a.notificarWhatsapp ?? (a.canalNotificacao === 'whatsapp' && !!a.telefoneSolicitante);
export function validarEmailCorporativo(email, configuracao = '') {
  if (!emailValido(email)) return 'Informe um e-mail válido.';
  const dominios = configuracao.split(',').map(d => d.trim().toLowerCase()).filter(Boolean);
  const dominio = String(email).trim().split('@')[1].toLowerCase();
  return dominios.length && !dominios.includes(dominio) ? `Use seu e-mail corporativo (${dominios.map(d => `@${d}`).join(' ou ')})` : '';
}
export function validarContatoAgendamento(dados, dominios = '') {
  const erro = validarEmailCorporativo(dados.emailSolicitante, dominios);
  if (erro) return erro;
  if (dados.notificarWhatsapp) {
    if (!normalizarTelefone(dados.telefoneSolicitante)) return 'Informe um telefone com DDD e 10 a 11 dígitos.';
    if (dados.consentimentoWhatsappTexto !== 'LGPD-v1' || !dados.consentimentoWhatsappEm || !Number.isFinite(Date.parse(dados.consentimentoWhatsappEm))) return 'Autorize o envio de notificações para o seu WhatsApp pessoal.';
  }
  return '';
}
