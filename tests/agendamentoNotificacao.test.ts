import { describe, it, expect } from 'vitest';
import { normalizarTelefone, mascaraTelefone, mascararContato, emailValido, montarMensagem, precisaNotificar } from '../utils/notificacaoAgendamento.mjs';
import { montarLinhaAgendamento, sincronizarLinha, CABECALHOS } from '../lib/agendamentoSheets.mjs';

describe('contato e mensagens de agendamento', () => {
  it('normaliza telefones com DDD, preserva DDI e rejeita comprimentos inválidos', () => {
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
  it('envia apenas status conhecidos ainda não notificados', () => {
    const linha = montarLinhaAgendamento('1', { status: 'pendente' });
    expect(precisaNotificar(linha)).toBe(true);
    linha[17] = 'Pendente';
    expect(precisaNotificar(linha)).toBe(false);
    linha[13] = 'Aprovado';
    expect(precisaNotificar(linha)).toBe(true);
    linha[13] = 'Inválido';
    expect(precisaNotificar(linha)).toBe(false);
  });
  it('monta recebimento, aprovação com observação e recusa com motivo', () => {
    const a = { sala: 'Sala 1', data: '10/11/2026', turno: 'Noturno', horarioInicio: '18:30', horarioFim: '19:20' };
    const mensagem = (dados: object) => montarMensagem(montarLinhaAgendamento('1', { ...a, ...dados }));
    expect(mensagem({ status: 'pendente' })).toContain('Aguarda análise do gestor');
    expect(mensagem({ status: 'pendente' })).toContain('Horário: 18:30 - 19:20');
    expect(mensagem({ status: 'aprovado', observacaoDecisao: 'Retirar chave' })).toContain('Observação do gestor: Retirar chave');
    expect(mensagem({ status: 'rejeitado', motivoRejeicao: 'Reforma' })).toContain('Motivo: Reforma');
    expect(mensagem({ status: 'rejeitado' })).toContain('NEGADA');
    expect(mensagem({ status: 'aprovado' })).toContain('SENAI Porto — Agendamento de Ambientes');
  });
});

describe('upsert Sheets', () => {
  it('cria cabeçalho e adiciona nova linha sem escrever colunas de notificação', async () => {
    const escritas: any[] = [];
    const cliente = { ler: async () => [], escrever: async (...args: any[]) => { escritas.push(args); }, adicionar: async (values: any[]) => { escritas.push(['append', values]); } };
    await sincronizarLinha(cliente, 'novo', { status: 'pendente' });
    expect(escritas[0]).toEqual(['A1:T1', [CABECALHOS]]);
    expect(escritas[1][0]).toBe('append');
    expect(escritas[1][1][0]).toHaveLength(17);
  });
  it('atualiza ID existente apenas em A:Q e mantém R:T intactas', async () => {
    const escritas: any[] = [];
    const cliente = { ler: async () => [['ID'], ['outro'], ['id']], escrever: async (...args: any[]) => { escritas.push(args); }, adicionar: async () => { throw new Error('Não deveria adicionar'); } };
    await sincronizarLinha(cliente, 'id', { status: 'rejeitado', observacaoDecisao: 'Reforma', decididoPor: 'Gestor' });
    expect(escritas[0][0]).toBe('A3:Q3');
    expect(escritas[0][1][0]).toHaveLength(17);
    expect(escritas[0][1][0].slice(13, 16)).toEqual(['Negado', 'Reforma', 'Gestor']);
  });
});
