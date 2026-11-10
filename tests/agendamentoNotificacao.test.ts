import { describe, it, expect, vi } from 'vitest';
import { normalizarTelefone, mascaraTelefone, emailValido, validarEmailCorporativo, validarContatoAgendamento, whatsappAutorizado } from '../utils/notificacaoAgendamento.mjs';
import { montarLinhaAgendamento, sincronizarLinha, CABECALHOS, validarCabecalho } from '../lib/agendamentoSheets.mjs';

const contato = { emailSolicitante: 'pessoa@findes.org.br', notificarWhatsapp: true, telefoneSolicitante: '(27) 99999-9999', consentimentoWhatsappEm: '2026-11-10T12:00:00.000Z', consentimentoWhatsappTexto: 'LGPD-v1' };
const dados = { ...contato, sala: 'Sala 1', data: '10/11/2026', turno: 'Noturno', horarioInicio: '18:30', horarioFim: '19:20', status: 'pendente' };
function clienteMemoria(linha = montarLinhaAgendamento('1', dados), cabecalho = CABECALHOS) {
  const linhas = linha.length ? [cabecalho, [...linha]] : [cabecalho];
  return { linhas, ler: vi.fn(async (faixa: string) => faixa === 'A1:G1' ? [cabecalho] : linhas), escrever: vi.fn(async (_faixa: string, _valores: any[]) => {}), adicionar: vi.fn(async (_valores: any[]) => {}) };
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
    expect(legado[2]).toBe('5527999999999');
    expect(montarLinhaAgendamento('1', { ...dados, notificarWhatsapp: false })[2]).toBe('');
  });
});

describe('linha simplificada de agendamento', () => {
  it('monta exatamente as sete colunas com solicitante e sala/data', () => {
    expect(CABECALHOS).toEqual(['ID', 'Nome', 'Telefone', 'E-mail', 'Status', 'Motivo', 'Sala / Data']);
    expect(montarLinhaAgendamento('1', { ...dados, solicitante: 'Maria' })).toEqual([
      '1', 'Maria', '5527999999999', contato.emailSolicitante, 'Pendente', '',
      'Sala 1 — 10/11/2026 (Noturno 18:30-19:20)'
    ]);
  });
  it('omite telefone sem autorização ou inválido', () => {
    expect(montarLinhaAgendamento('1', { ...dados, notificarWhatsapp: false })[2]).toBe('');
    expect(montarLinhaAgendamento('1', { ...dados, notificarWhatsapp: undefined })[2]).toBe('');
    expect(montarLinhaAgendamento('1', { ...dados, telefoneSolicitante: '123' })[2]).toBe('');
  });
  it.each([
    ['pendente', 'Pendente', ''],
    ['aprovado', 'Aprovado', 'Retirar chave'],
    ['rejeitado', 'Negado', 'Sala indisponível']
  ])('escolhe o motivo conforme o status %s', (status, esperado, motivo) => {
    expect(montarLinhaAgendamento('1', { ...dados, status, observacaoDecisao: 'Retirar chave', motivoRejeicao: 'Sala indisponível' }).slice(4, 6)).toEqual([esperado, motivo]);
  });
  it('não usa recusa antiga como observação de aprovação e aceita recusa em observacaoDecisao', () => {
    expect(montarLinhaAgendamento('1', { ...dados, status: 'aprovado', motivoRejeicao: 'Recusa antiga' })[5]).toBe('');
    expect(montarLinhaAgendamento('1', { ...dados, status: 'rejeitado', observacaoDecisao: 'Reforma' })[5]).toBe('Reforma');
  });
});

describe('upsert e cabeçalho Sheets', () => {
  it('cria cabeçalho vazio e adiciona a primeira linha de dados', async () => {
    const cliente = clienteMemoria([], []);
    await sincronizarLinha(cliente, 'novo', dados);
    expect(cliente.ler.mock.calls).toEqual([['A1:G1'], ['A:A']]);
    expect(cliente.escrever.mock.calls).toEqual([['A1:G1', [CABECALHOS]]]);
    expect(cliente.adicionar.mock.calls).toEqual([[[montarLinhaAgendamento('novo', dados)]]]);
  });
  it('usa adicionar quando a coluna A está completamente vazia', async () => {
    const cliente = clienteMemoria([], []);
    cliente.ler.mockResolvedValue([]);
    await sincronizarLinha(cliente, 'novo', dados);
    expect(cliente.escrever.mock.calls).toEqual([['A1:G1', [CABECALHOS]]]);
    expect(cliente.adicionar.mock.calls).toEqual([[[montarLinhaAgendamento('novo', dados)]]]);
  });
  it('atualiza pelo ID apenas A:G preservando H em diante', async () => {
    const extras = ['Controle do agente', 'Enviado'];
    const cliente = clienteMemoria([...montarLinhaAgendamento('1', dados), ...extras], [...CABECALHOS, 'Controle', 'Envio']);
    const atualizado = { ...dados, status: 'rejeitado', motivoRejeicao: 'Reforma' };
    await sincronizarLinha(cliente, '1', atualizado);
    expect(cliente.escrever.mock.calls).toEqual([['A2:G2', [montarLinhaAgendamento('1', atualizado)]]]);
    expect(cliente.adicionar).not.toHaveBeenCalled();
    expect(cliente.linhas[1].slice(7)).toEqual(extras);
  });
  it('usa adicionar para novo ID com linhas existentes', async () => {
    const cliente = clienteMemoria();
    await sincronizarLinha(cliente, 'novo', dados);
    expect(cliente.adicionar.mock.calls).toEqual([[[montarLinhaAgendamento('novo', dados)]]]);
    expect(cliente.escrever).not.toHaveBeenCalled();
  });
  it('valida somente as sete primeiras colunas do cabeçalho', () => {
    expect(validarCabecalho([...CABECALHOS, 'Extra', 'Outro'])).toBe(true);
    expect(validarCabecalho()).toBe(false);
    expect(validarCabecalho(['', '', '', '', '', '', '', 'Extra'])).toBe(false);
  });
  it('não grava dados com cabeçalho antigo, parcial ou diferente', async () => {
    for (const cabecalho of [['ID'], ['ID', 'Criado em', 'Sala'], CABECALHOS.map(c => c === 'E-mail' ? 'Canal' : c)]) {
      const cliente = clienteMemoria(undefined, cabecalho);
      await expect(sincronizarLinha(cliente, '1', dados)).rejects.toThrow('Cabeçalho da planilha diferente do esperado');
      expect(cliente.escrever).not.toHaveBeenCalled();
      expect(cliente.adicionar).not.toHaveBeenCalled();
      expect(cliente.ler).toHaveBeenCalledTimes(1);
    }
  });
});
