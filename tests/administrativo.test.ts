import { test } from 'vitest';
import assert from 'node:assert/strict';
import { dataLocal, prioridadesDoDia, validarCompromisso, AGENDA_ROLES, GESTAO_ROLES } from '../utils/administrativo';
import { resolveAppView } from '../utils/routes';

test('administrativo não colide com admin e mantém rotas e aliases existentes', () => {
  for (const path of ['/administrativo', '/administrativo/']) assert.equal(resolveAppView(path), 'administrativo');
  for (const hash of ['#administrativo', '#/administrativo']) assert.equal(resolveAppView('/', hash), 'administrativo');
  for (const route of ['admin', 'midia', 'usuarios', 'logs', 'agendamento', 'painelcliente', 'limpeza']) {
    assert.equal(resolveAppView(`/${route}`), route);
    assert.equal(resolveAppView('/', `#/${route}`), route);
  }
  assert.equal(resolveAppView('/recepcao'), 'painelcliente');
  assert.equal(resolveAppView('/auditoria'), 'logs');
  assert.equal(resolveAppView('/'), 'dashboard');
});

test('prioridades respeitam a data, a conclusão e a urgência', () => {
  const base = { sala: 'Sala 1', data: '2026-09-28', observacao: '', concluida: false };
  const result = prioridadesDoDia([
    { ...base, id: 'normal', prioridade: 'normal' },
    { ...base, id: 'concluida', prioridade: 'urgente', concluida: true },
    { ...base, id: 'urgente', prioridade: 'urgente' },
    { ...base, id: 'amanha', prioridade: 'urgente', data: '2026-09-29' },
    { ...base, id: 'alta', prioridade: 'alta' },
  ], '2026-09-28');
  assert.deepEqual(result.map(item => item.id), ['urgente', 'alta', 'normal']);
});
test('agenda rejeita intervalos inválidos e datas inexistentes', () => {
  const valid = { titulo: 'Reunião', data: '2026-09-28', inicio: '09:00', fim: '10:00', local: '', descricao: '' };
  assert.doesNotThrow(() => validarCompromisso(valid));
  for (const patch of [{ fim: '08:00' }, { fim: '09:00' }, { inicio: '25:00' }, { titulo: ' ' }, { data: '2026-02-30' }]) {
    assert.throws(() => validarCompromisso({ ...valid, ...patch }));
  }
});
test('mídia visualiza a agenda sem gerenciar prioridades ou compromissos', () => {
  assert.ok(AGENDA_ROLES.includes('midia'));
  assert.ok(AGENDA_ROLES.includes('comunicacao'));
  assert.ok(!GESTAO_ROLES.includes('midia'));
  assert.ok(!GESTAO_ROLES.includes('comunicacao'));
});
test('datas são calculadas no calendário local', () => {
  assert.equal(dataLocal(new Date(2026, 8, 28, 23, 59)), '2026-09-28');
});
