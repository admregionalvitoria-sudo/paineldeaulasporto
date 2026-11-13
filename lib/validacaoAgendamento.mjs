import { erroHttp } from './autenticacaoApi.mjs';

const limites = {
  solicitante: 120, emailSolicitante: 160, telefoneSolicitante: 40,
  consentimentoWhatsappEm: 40, consentimentoWhatsappTexto: 120,
  status: 10, motivoRejeicao: 500, observacaoDecisao: 500,
  sala: 200, data: 20, turno: 40, horarioInicio: 5, horarioFim: 5
};

export function sanearDadosAgendamento(dados) {
  const invalido = campo => { throw erroHttp(400, `Campo ${campo} inválido.`); };
  if (!dados || typeof dados !== 'object' || Array.isArray(dados)) invalido('dados');
  const resultado = {};
  for (const [campo, limite] of Object.entries(limites)) {
    if (dados[campo] === undefined || dados[campo] === null) continue;
    if (typeof dados[campo] !== 'string') invalido(campo);
    let valor = dados[campo].replace(/[\u0000-\u001f\u007f-\u009f]/g, '').trim();
    if (campo === 'telefoneSolicitante') valor = valor.replace(/\D/g, '');
    if (valor.length > (campo === 'telefoneSolicitante' ? 13 : limite)) invalido(campo);
    resultado[campo] = valor;
  }
  // O consentimento é booleano no modelo do formulário; não converter strings truthy.
  if (dados.notificarWhatsapp !== undefined && typeof dados.notificarWhatsapp !== 'boolean') invalido('notificarWhatsapp');
  resultado.notificarWhatsapp = dados.notificarWhatsapp === true;
  for (const campo of ['solicitante', 'sala', 'data', 'turno']) {
    if (!resultado[campo]) invalido(campo);
  }
  // Reservas antigas não têm e-mail; quando houver, precisa ser válido.
  if (resultado.emailSolicitante && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(resultado.emailSolicitante)) invalido('emailSolicitante');
  if (!['pendente', 'aprovado', 'rejeitado'].includes(resultado.status)) invalido('status');
  if ((resultado.telefoneSolicitante || resultado.notificarWhatsapp) && !/^\d{10,13}$/.test(resultado.telefoneSolicitante || '')) invalido('telefoneSolicitante');
  if (resultado.notificarWhatsapp && (resultado.consentimentoWhatsappTexto !== 'LGPD-v1' || !Number.isFinite(Date.parse(resultado.consentimentoWhatsappEm)))) invalido('consentimentoWhatsapp');
  return resultado;
}
