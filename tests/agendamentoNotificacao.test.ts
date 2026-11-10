import { describe, it, expect, vi } from 'vitest';
import { normalizarTelefone, mascaraTelefone, mascararContato, emailValido, validarEmailCorporativo, validarContatoAgendamento, whatsappAutorizado, montarMensagem, montarAssunto, precisaNotificar } from '../utils/notificacaoAgendamento.mjs';
import { montarLinhaAgendamento, sincronizarLinha, CABECALHOS } from '../lib/agendamentoSheets.mjs';
import { ciclo } from '../scripts/notificador-agendamentos.mjs';

const contato = { emailSolicitante: 'pessoa@findes.org.br', notificarWhatsapp: true, telefoneSolicitante: '(27) 99999-9999', consentimentoWhatsappEm: '2026-11-10T12:00:00.000Z', consentimentoWhatsappTexto: 'LGPD-v1' };
const dados = { ...contato, sala: 'Sala 1', data: '10/11/2026', turno: 'Noturno', horarioInicio: '18:30', horarioFim: '19:20', status: 'pendente' };
function clienteMemoria(linha = montarLinhaAgendamento('1', dados), cabecalho = CABECALHOS) {
  const linhas = [cabecalho, [...linha]];
  return { linhas, ler: vi.fn(async (faixa: string) => faixa === '1:1' ? [cabecalho] : linhas), escrever: vi.fn(async (_faixa: string, _valores: any[]) => {}), adicionar: vi.fn(async (_valores: any[]) => {}) };
}

describe('contato, domínio corporativo e consentimento', () => {
  it('normaliza e mascara telefone', () => {
    expect(normalizarTelefone('(27) 99999-9999')).toBe('5527999999999');
    expect(normalizarTelefone('27 3333-4444')).toBe('552733334444');
    expect(normalizarTelefone('+55 (27) 99999-9999')).toBe('5527999999999');
    expect(normalizarTelefone('9999')).toBe('');
    expect(normalizarTelefone('12345678901234')).toBe('');
    expect(mascaraTelefone('27999999999')).toBe('(27) 99999-9999');
    expect(mascaraTelefone('2733334444')).toBe('(27) 3333-4444');
    expect(mascararContato('5527999999999')).toBe('***9999');
    expect(emailValido('pessoa@gmail.com')).toBe(true);
    expect(emailValido('pessoa@')).toBe(false);
  });
  it('aceita qualquer e-mail válido sem configuração e exige domínio exato quando configurado', () => {
    expect(validarEmailCorporativo('pessoa@gmail.com')).toBe('');
    expect(validarEmailCorporativo(' Pessoa@FINDES.ORG.BR ', ' findes.org.br, senaies.com.br, ')).toBe('');
    expect(validarEmailCorporativo('pessoa@senaies.com.br', 'findes.org.br,senaies.com.br')).toBe('');
    for (const email of ['pessoa@gmail.com', 'pessoa@sub.findes.org.br', 'pessoa@fakefindes.org.br']) {
      expect(validarEmailCorporativo(email, 'findes.org.br,senaies.com.br')).toBe('Use seu e-mail corporativo (@findes.org.br ou @senaies.com.br)');
    }
    expect(validarEmailCorporativo('')).toBe('Informe um e-mail válido.');
  });
  it('exige e-mail sempre e telefone e consentimento apenas para WhatsApp', () => {
    expect(validarContatoAgendamento(contato)).toBe('');
    expect(validarContatoAgendamento({ ...contato, emailSolicitante: '' })).toContain('e-mail válido');
    expect(validarContatoAgendamento({ ...contato, telefoneSolicitante: '123' })).toContain('telefone');
    for (const invalido of [{ consentimentoWhatsappEm: '' }, { consentimentoWhatsappEm: 'inválido' }, { consentimentoWhatsappTexto: '' }]) {
      expect(validarContatoAgendamento({ ...contato, ...invalido })).toContain('Autorize');
    }
    expect(validarContatoAgendamento({ emailSolicitante: contato.emailSolicitante, notificarWhatsapp: false })).toBe('');
  });
  it('lê registros antigos e respeita a desativação explícita', () => {
    expect(whatsappAutorizado({ canalNotificacao: 'whatsapp', telefoneSolicitante: contato.telefoneSolicitante })).toBe(true);
    expect(whatsappAutorizado({ canalNotificacao: 'whatsapp' })).toBe(false);
    expect(whatsappAutorizado({ ...contato, notificarWhatsapp: false, canalNotificacao: 'whatsapp' })).toBe(false);
    const legado = montarLinhaAgendamento('1', { canalNotificacao: 'whatsapp', telefoneSolicitante: contato.telefoneSolicitante });
    expect(legado.slice(11, 14)).toEqual(['Sim', '5527999999999', '']);
    expect(montarLinhaAgendamento('1', { ...dados, notificarWhatsapp: false }).slice(11, 14)).toEqual(['Não', '', '']);
  });
});

describe('decisão e mensagens por canal', () => {
  it('controla status independentemente e exige Sim e telefone válido para WhatsApp', () => {
    const linha = montarLinhaAgendamento('1', dados);
    expect(precisaNotificar(linha, 'email')).toBe(true);
    expect(precisaNotificar(linha, 'whatsapp')).toBe(true);
    linha[18] = 'Pendente';
    expect(precisaNotificar(linha, 'email')).toBe(false);
    expect(precisaNotificar(linha, 'whatsapp')).toBe(true);
    linha[20] = 'Pendente';
    expect(precisaNotificar(linha, 'whatsapp')).toBe(false);
    linha[14] = 'Aprovado';
    expect(precisaNotificar(linha, 'email')).toBe(true);
    expect(precisaNotificar(linha, 'whatsapp')).toBe(true);
    linha[11] = 'Não';
    expect(precisaNotificar(linha, 'whatsapp')).toBe(false);
    linha[11] = 'Sim'; linha[12] = '123';
    expect(precisaNotificar(linha, 'whatsapp')).toBe(false);
    linha[14] = 'Inválido';
    expect(precisaNotificar(linha, 'email')).toBe(false);
  });
  it.each([['pendente', 'Solicitação recebida'], ['aprovado', 'Reserva APROVADA'], ['rejeitado', 'Reserva NEGADA']])('monta assunto e corpo para %s', (status, titulo) => {
    const linha = montarLinhaAgendamento('1', { ...dados, status, observacaoDecisao: 'Retirar chave' });
    expect(montarAssunto(linha)).toBe(`${titulo} — Sala 1 / 10/11/2026`);
    expect(montarMensagem(linha)).toContain('Horário: 18:30 - 19:20');
    if (status !== 'pendente') expect(montarMensagem(linha)).toContain('Retirar chave');
    expect(montarMensagem(linha, 'whatsapp')).toContain('Você recebe esta mensagem porque autorizou notificações no formulário de agendamento.');
    expect(montarMensagem(linha)).not.toContain('porque autorizou');
  });
  it('informa recusa mesmo sem motivo registrado', () => {
    expect(montarMensagem(montarLinhaAgendamento('1', { ...dados, status: 'rejeitado' }))).toContain('Motivo não informado pelo gestor.');
  });
});

describe('upsert e cabeçalho Sheets', () => {
  it('cria cabeçalho vazio e adiciona somente A:R', async () => {
    const cliente = clienteMemoria([], []);
    await sincronizarLinha(cliente, 'novo', dados);
    expect(cliente.escrever).toHaveBeenCalledWith('A1:W1', [CABECALHOS]);
    expect(cliente.adicionar.mock.calls[0][0][0]).toHaveLength(18);
    expect(montarLinhaAgendamento('1', dados).slice(10, 15)).toEqual([contato.emailSolicitante, 'Sim', '5527999999999', contato.consentimentoWhatsappEm, 'Pendente']);
  });
  it('atualiza apenas A:R preservando S:W', async () => {
    const cliente = clienteMemoria();
    await sincronizarLinha(cliente, '1', { ...dados, status: 'rejeitado', observacaoDecisao: 'Reforma', decididoPor: 'Gestor' });
    expect(cliente.escrever).toHaveBeenCalledTimes(1);
    expect(cliente.escrever.mock.calls[0][0]).toBe('A2:R2');
    expect(cliente.escrever.mock.calls[0][1][0].slice(14, 17)).toEqual(['Negado', 'Reforma', 'Gestor']);
  });
  it('não grava nem envia ao encontrar cabeçalho antigo, parcial ou diferente', async () => {
    for (const cabecalho of [['ID'], [...CABECALHOS, 'Extra'], CABECALHOS.map(c => c === 'E-mail' ? 'Canal' : c)]) {
      const cliente = clienteMemoria(undefined, cabecalho);
      await expect(sincronizarLinha(cliente, '1', dados)).rejects.toThrow('Cabeçalho da planilha diferente do esperado');
      const enviar = vi.fn();
      await expect(ciclo(cliente, enviar)).rejects.toThrow('Cabeçalho da planilha diferente do esperado');
      expect(cliente.escrever).not.toHaveBeenCalled();
      expect(cliente.adicionar).not.toHaveBeenCalled();
      expect(enviar).not.toHaveBeenCalled();
    }
  });
});

describe('notificador independente e retry por linha e canal', () => {
  it('entrega WhatsApp mesmo com falha de e-mail e repete só o canal falho após 5 minutos', async () => {
    const cliente = clienteMemoria();
    const tentativas = new Map();
    let agora = 1000000;
    const enviar = vi.fn(async (_linha: any[], canal: string) => { if (canal === 'email') throw new Error('erro SMTP com dados privados'); });
    await ciclo(cliente, enviar, () => agora, tentativas);
    expect(enviar.mock.calls.map(c => c[1])).toEqual(['email', 'whatsapp']);
    expect(cliente.escrever).toHaveBeenCalledWith('U2:V2', [['Pendente', expect.any(String)]]);
    expect(cliente.escrever).toHaveBeenLastCalledWith('W2', [['E-mail: Falha ao enviar notificação']]);
    cliente.linhas[1][22] = 'E-mail: Falha ao enviar notificação';
    agora += 299999;
    await ciclo(cliente, enviar, () => agora, tentativas);
    expect(enviar).toHaveBeenCalledTimes(2);
    agora += 1;
    await ciclo(cliente, enviar, () => agora, tentativas);
    expect(enviar).toHaveBeenCalledTimes(3);
    expect(enviar.mock.calls[2][1]).toBe('email');
  });
  it('preserva os dois erros e limpa somente o canal recuperado', async () => {
    const cliente = clienteMemoria();
    const tentativas = new Map();
    await ciclo(cliente, async () => { throw new Error('falhou'); }, () => 1000000, tentativas);
    const erros = 'E-mail: Falha ao enviar notificação\nWhatsApp: Falha ao enviar notificação';
    expect(cliente.escrever).toHaveBeenLastCalledWith('W2', [[erros]]);
    cliente.linhas[1][22] = erros;
    await ciclo(cliente, async (_linha: any[], canal: string) => { if (canal === 'whatsapp') throw new Error('falhou'); }, () => 1300000, tentativas);
    expect(cliente.escrever).toHaveBeenCalledWith('S2:T2', [['Pendente', expect.any(String)]]);
    expect(cliente.escrever).toHaveBeenLastCalledWith('W2', [['WhatsApp: Falha ao enviar notificação']]);
  });
  it('nunca envia WhatsApp sem Sim, ainda que haja telefone', async () => {
    const linha = montarLinhaAgendamento('1', dados); linha[11] = 'Não';
    const cliente = clienteMemoria(linha);
    const enviar = vi.fn(async () => {});
    await ciclo(cliente, enviar, Date.now, new Map());
    expect(enviar).toHaveBeenCalledTimes(1);
    expect(enviar.mock.calls[0][1]).toBe('email');
  });
});
